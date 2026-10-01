import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceConfig = path.join(projectRoot, "wrangler.jsonc");
const bootstrapConfig = path.join(projectRoot, ".wrangler-bootstrap.generated.jsonc");

const config = JSON.parse(await readFile(sourceConfig, "utf8"));
delete config.routes;
delete config.env;

let createdConfig = false;
try {
  await writeFile(bootstrapConfig, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  createdConfig = true;
  const result = spawnSync("npm", [
    "exec", "--", "wrangler", "deploy", "--env=", "--config", path.basename(bootstrapConfig),
  ], { cwd: projectRoot, stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  if (createdConfig) await rm(bootstrapConfig, { force: true });
}
