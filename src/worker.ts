import { getDatabase, type DatabaseEnv } from "./db";

interface WorkerEnv extends DatabaseEnv {
  ASSETS: Fetcher;
  BETA_RATE_LIMITER: RateLimit;
  RESEND_API_KEY?: string;
  SITE_ENV?: "dev" | "staging";
}

const MAX_BODY_BYTES = 2_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_NOTICE_VERSION = "2026-09-30-v2";
const SEO_REDIRECTS = new Map<string, string>([
  ["/blog/long-form-ai-writer", "/blog/how-do-you-keep-long-form-ai-writing-coherent"],
  ["/blog/long-form-ai-writer.html", "/blog/how-do-you-keep-long-form-ai-writing-coherent"],
  ["/blog/ai-writing-workflow", "/blog/how-does-an-ai-writing-workflow-work"],
  ["/blog/ai-writing-workflow.html", "/blog/how-does-an-ai-writing-workflow-work"],
  ["/blog/ai-writing-api", "/blog/what-should-you-look-for-in-an-ai-writing-api"],
  ["/blog/ai-writing-api.html", "/blog/what-should-you-look-for-in-an-ai-writing-api"],
  ["/blog/ai-writing-agent", "/blog/what-is-an-ai-writing-agent"],
  ["/blog/ai-writing-agent.html", "/blog/what-is-an-ai-writing-agent"],
  ["/blog/ai-content-generator-vs-writing-engine", "/blog/ai-content-generator-vs-ai-writing-engine"],
  ["/blog/ai-content-generator-vs-writing-engine.html", "/blog/ai-content-generator-vs-ai-writing-engine"],
]);

function json(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RangeError("BODY_TOO_LARGE");
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function sendConfirmation(env: WorkerEnv, to: string) {
  if (!env.RESEND_API_KEY) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
      to,
      from: "Ceilord <hello@ceilord.com>",
      reply_to: "support@ceilord.com",
      subject: "You're on the Ceilord private access list",
      text: "Thanks for requesting private access to Ceilord.\n\nYour request is in. Access opens in small batches, and we will email you at this address when your place opens. This is a one-time confirmation, not a newsletter.\n\nTo withdraw your request, reply to this email or write to support@ceilord.com.\n\nCeilord",
      html: '<div style="font-family:Helvetica,Arial,sans-serif;color:#262626;max-width:480px;line-height:1.6"><p>Thanks for requesting private access to Ceilord.</p><p>Your request is in. Access opens in small batches, and we will email you at this address when your place opens. This is a one-time confirmation, not a newsletter.</p><p style="color:#7d7d7d">To withdraw your request, reply to this email or write to support@ceilord.com.</p><p>Ceilord</p></div>',
      }),
    });
    if (!res.ok) throw new Error(`resend_${res.status}`);
  } catch (error) {
    // Email is best-effort: the signup is already stored.
    console.error(JSON.stringify({ event: "beta_confirmation_error", error: error instanceof Error ? error.name : "UnknownError" }));
  }
}

async function handleBetaSignup(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return json(415, { error: "Content-Type must be application/json." });
  }

  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    return json(403, { error: "Cross-site submissions are not allowed." });
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return json(403, { error: "Cross-site submissions are not allowed." });
  }

  const rateKey = request.headers.get("cf-connecting-ip") ?? "unknown";
  const rate = await env.BETA_RATE_LIMITER.limit({ key: rateKey });
  if (!rate.success) {
    return json(429, { error: "Too many requests. Try again shortly." });
  }

  let body: Record<string, unknown> | null;
  try {
    body = await readJson(request);
  } catch (error) {
    const tooLarge = error instanceof RangeError && error.message === "BODY_TOO_LARGE";
    return json(tooLarge ? 413 : 400, {
      error: tooLarge ? "Request too large." : "Couldn’t read that request.",
    });
  }

  if (!body) return json(400, { error: "Couldn’t read that request." });

  // Honeypot: act successful without storing bot submissions.
  if (typeof body.company === "string" && body.company.trim()) return json(200, { ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!EMAIL_RE.test(email)) return json(400, { error: "Enter a valid email address." });
  if (body.consent !== true || body.noticeVersion !== SIGNUP_NOTICE_VERSION) {
    return json(400, { error: "Please agree to the Terms and beta email notice to continue." });
  }

  const createdAt = new Date().toISOString();
  const db = getDatabase(env);
  const result = await (await db.prepare(
    "INSERT OR IGNORE INTO beta_signups (email, created_at, notice_version, consented_at) VALUES (?, ?, ?, ?)",
  )).run([email, createdAt, SIGNUP_NOTICE_VERSION, createdAt]);

  // Only email brand-new addresses so resubmitting can't be used to spam someone.
  if (result.rowsAffected > 0) ctx.waitUntil(sendConfirmation(env, email));

  // Deliberately return the same response for new and existing addresses.
  // This prevents beta-list membership enumeration and preserves the original
  // consent timestamp/version instead of letting unauthenticated re-submits
  // overwrite an existing audit record.
  return json(202, { ok: true });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const redirectTarget = SEO_REDIRECTS.get(url.pathname);
    if (redirectTarget && (request.method === "GET" || request.method === "HEAD")) {
      const location = new URL(redirectTarget, url.origin);
      location.search = url.search;
      return new Response(null, {
        status: 301,
        headers: {
          location: location.toString(),
          "cache-control": "public, max-age=3600",
        },
      });
    }

    if (url.pathname !== "/api/beta") return json(404, { error: "Not found." });
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed." }), {
        status: 405,
        headers: {
          "allow": "POST",
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
          "x-content-type-options": "nosniff",
        },
      });
    }

    try {
      return await handleBetaSignup(request, env, ctx);
    } catch (error) {
      console.error(JSON.stringify({
        event: "beta_signup_error",
        error: error instanceof Error ? error.name : "UnknownError",
      }));
      return json(500, { error: "Something went wrong." });
    }
  },
};
