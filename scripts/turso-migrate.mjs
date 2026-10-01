import { readdir, readFile } from "node:fs/promises";
import { connect } from "@tursodatabase/serverless";

const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
if (!url || !authToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before running migrations.");
  process.exit(1);
}

const db = connect({ url, authToken });
await db.run(`CREATE TABLE IF NOT EXISTS _ceilord_migrations (
  name TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
)`);

const files = (await readdir(new URL("../migrations/", import.meta.url)))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

for (const name of files) {
  const applied = await db.get("SELECT 1 AS ok FROM _ceilord_migrations WHERE name = ?", [name]);
  if (applied?.ok) continue;

  // Bootstrap databases created before the migration ledger existed.
  if (name === "0001_beta_signups.sql") {
    const exists = await db.get("SELECT 1 AS ok FROM sqlite_schema WHERE type='table' AND name='beta_signups'");
    if (exists?.ok) {
      await db.run("INSERT INTO _ceilord_migrations(name, applied_at) VALUES(?, ?)", [name, new Date().toISOString()]);
      console.log(`recorded existing ${name}`);
      continue;
    }
  }
  if (name === "0002_signup_consent.sql") {
    const columns = await db.all("PRAGMA table_info(beta_signups)");
    const names = new Set(columns.map((row) => row.name));
    if (names.has("notice_version") && names.has("consented_at")) {
      await db.run("INSERT INTO _ceilord_migrations(name, applied_at) VALUES(?, ?)", [name, new Date().toISOString()]);
      console.log(`recorded existing ${name}`);
      continue;
    }
  }

  const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
  for (const statement of sql.split(";").map((value) => value.trim()).filter(Boolean)) {
    await db.run(statement);
  }
  await db.run("INSERT INTO _ceilord_migrations(name, applied_at) VALUES(?, ?)", [name, new Date().toISOString()]);
  console.log(`applied ${name}`);
}
