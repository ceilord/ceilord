import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, normalize } from "node:path";

const PORT = Number.parseInt(process.env.CEILORD_SITE_PORT ?? "4770", 10);
const SITE_DIR = join(process.cwd(), "site");
const DATA_DIR = process.env.CEILORD_DIR ?? join(homedir(), ".ceilord");
const WAITLIST_FILE = join(DATA_DIR, "beta-signups.jsonl");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_NOTICE_VERSION = "2026-09-30-v2";
const MAX_BODY = 2_000;

type Signup = { email: string; createdAt: string; noticeVersion?: string };
const knownEmails = new Set<string>();
const attempts = new Map<string, { count: number; resetAt: number }>();

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function hydrateKnownEmails() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(WAITLIST_FILE, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Signup;
        if (typeof row.email === "string") knownEmails.add(row.email);
      } catch {
        // Preserve valid historical rows even if one line is malformed.
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

function json(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function clientKey(req: IncomingMessage) {
  return req.socket.remoteAddress ?? "unknown";
}

function allowAttempt(req: IncomingMessage) {
  const key = clientKey(req);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}

async function readBody(req: IncomingMessage) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString();
    if (raw.length > MAX_BODY) throw new Error("BODY_TOO_LARGE");
  }
  return raw;
}

async function handleSignup(req: IncomingMessage, res: ServerResponse) {
  if (!allowAttempt(req)) return json(res, 429, { error: "Too many attempts. Try again in a minute." });

  let body: Record<string, unknown>;
  try {
    const raw = await readBody(req);
    body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch (error) {
    const tooLarge = (error as Error).message === "BODY_TOO_LARGE";
    return json(res, tooLarge ? 413 : 400, { error: tooLarge ? "Request too large." : "Couldn’t read that request." });
  }

  // Honeypot: act successful without storing bot submissions.
  if (typeof body.company === "string" && body.company.trim()) return json(res, 200, { ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email address." });
  if (body.consent !== true || body.noticeVersion !== SIGNUP_NOTICE_VERSION) {
    return json(res, 400, { error: "Please agree to the Terms and beta email notice to continue." });
  }

  if (!knownEmails.has(email)) {
    const row: Signup = { email, createdAt: new Date().toISOString(), noticeVersion: SIGNUP_NOTICE_VERSION };
    await appendFile(WAITLIST_FILE, JSON.stringify(row) + "\n", { encoding: "utf8", mode: 0o600 });
    knownEmails.add(email);
  }

  // Match production behavior: do not reveal whether an address is already registered.
  return json(res, 202, { ok: true });
}

function safeSitePath(urlPath: string) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const requested = decoded === "/" ? "/index.html" : decoded;
  const clean = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(SITE_DIR, clean.replace(/^[/\\]+/, ""));
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const filePath = safeSitePath(req.url ?? "/");
  if (!filePath.startsWith(SITE_DIR)) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mime[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "content-security-policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    res.writeHead(code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    res.end(code === "ENOENT" ? "Not found" : "Server error");
  }
}

await hydrateKnownEmails();

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/beta") return await handleSignup(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD, POST" }).end();
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    console.error("Landing server error:", error);
    json(res, 500, { error: "Something went wrong." });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("ceilord beta lander → http://127.0.0.1:" + PORT);
  console.log("beta signups → " + WAITLIST_FILE);
});
