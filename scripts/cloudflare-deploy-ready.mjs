import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const target = process.argv[2] ?? "production";
const envFlag = target === "production" ? "" : target;
const expectedName = target === "production" ? "ceilord" : `ceilord-${target}`;
const settings = target === "production" ? config : config.env?.[target];
const problems = [];

if (!settings) problems.push(`${target}: Wrangler environment is missing`);
if ((settings?.name ?? config.name) !== expectedName) problems.push(`${target}: expected Worker name ${expectedName}`);
if (Array.isArray(settings?.d1_databases) && settings.d1_databases.length) problems.push(`${target}: D1 bindings are obsolete; Turso is the persistence layer`);
if (settings?.vars?.TURSO_DATABASE_URL || settings?.vars?.TURSO_AUTH_TOKEN) problems.push(`${target}: Turso credentials must be Worker secrets, never plaintext vars`);
if (target !== "production" && (settings?.routes?.length ?? 0) !== 0) problems.push(`${target}: non-production environment must not own production routes`);

if (!problems.length) {
  const result = spawnSync("npx", ["wrangler", "secret", "list", `--env=${envFlag}`], { encoding: "utf8" });
  if (result.status !== 0) {
    problems.push(`${target}: could not read Worker secret names`);
  } else {
    try {
      const names = new Set(JSON.parse(result.stdout).map((secret) => secret.name));
      for (const required of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]) {
        if (!names.has(required)) problems.push(`${target}: missing Worker secret ${required}`);
      }
    } catch {
      problems.push(`${target}: Wrangler secret list returned unexpected output`);
    }
  }
}

if (problems.length) {
  console.error("Cloudflare deployment blocked:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`${target}: Cloudflare/Turso deployment prerequisites verified.`);
