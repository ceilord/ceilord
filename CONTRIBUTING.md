# Contributing

Use a feature branch and keep changes focused. Never commit `.env`, `.dev.vars`, API tokens, private keys, production exports, user data, or Cloudflare/Turso credentials.

Before opening a pull request:

```sh
npm ci
npm run check
npm audit --omit=dev --audit-level=high
```

Database schema changes belong in `migrations/`. Run them only against an explicitly selected non-production database while developing. Production, development, and staging credentials must remain separate.

Changes to product claims or public positioning must remain consistent with the repository's canonical product documentation. Security reports should follow `SECURITY.md` rather than public issues.
