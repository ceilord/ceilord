import { connect } from "@tursodatabase/serverless";

export interface DatabaseEnv {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export function getDatabase(env: DatabaseEnv) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("Turso database credentials are not configured");
  }
  return connect({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}
