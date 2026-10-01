# Ceilord (open core)

Public site and signup Worker for [Ceilord](https://ceilord.com), an AI writing model offered as an API.

This repository holds the open parts: the public site (`site/`), the signup Worker (`src/worker.ts`), schema migrations and deployment scripts. The writing model, its prompts and its training data are not part of it and are served through the hosted Ceilord API.

## Develop

```sh
npm ci
npm run landing   # static site on http://127.0.0.1:4770
npm run check     # typecheck
```

See CLOUDFLARE.md for deployment and SECURITY.md for reporting vulnerabilities. Licensed under MIT.
