import { execFileSync } from "node:child_process";

const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Stripe live key", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/],
  ["JWT-like credential", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
  ["credential in URL", /https?:\/\/[^\s/:@]{2,}:[^\s/@]{4,}@/],
  ["Turso token assignment", /TURSO_AUTH_TOKEN\s*=\s*[^\s$<{][^\s]*/],
];

function git(args, encoding = "utf8") {
  return execFileSync("git", args, {
    encoding,
    stdio: ["ignore", "pipe", "ignore"],
    // Blobs up to 5 MB are intentionally inspected below. Node's default
    // execFileSync buffer is ~1 MB, which is too small for legitimate binary
    // assets such as README images before we can identify and skip them.
    maxBuffer: 6 * 1024 * 1024,
  });
}

const objectPaths = new Map();
for (const line of git(["rev-list", "--objects", "--all"]).split("\n")) {
  if (!line) continue;
  const [oid, ...rest] = line.split(" ");
  if (rest.length) objectPaths.set(oid, rest.join(" "));
}

const findings = [];
for (const [oid, filePath] of objectPaths) {
  let type;
  try { type = git(["cat-file", "-t", oid]).trim(); } catch { continue; }
  if (type !== "blob") continue;
  const size = Number(git(["cat-file", "-s", oid]).trim());
  if (!Number.isFinite(size) || size > 5_000_000) continue;
  const buffer = git(["cat-file", "blob", oid], null);
  if (buffer.subarray(0, 8192).includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) findings.push({ label, oid: oid.slice(0, 12), filePath });
  }
}

if (findings.length) {
  console.error("Potential credential material found in Git history (values intentionally not printed):");
  for (const finding of findings) console.error(`- ${finding.label}: ${finding.filePath} @ ${finding.oid}`);
  process.exit(1);
}
console.log(`Secret scan passed across ${objectPaths.size} reachable Git objects.`);
