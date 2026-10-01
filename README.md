<h1 align="center">Ceilord</h1>

<p align="center"><strong>AI writing for long-form work, built from real human-writing behavior.</strong></p>

<p align="center">
  Ceilord is being built to take a topic or brief and produce the writing itself — not to rewrite or “humanize” a finished AI draft.
</p>

<p align="center">
  <a href="https://github.com/ceilord/ceilord/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ceilord/ceilord/ci.yml?branch=master&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/access-private-black" alt="Private access">
  <img src="https://img.shields.io/badge/node-%3E%3D22-black" alt="Node 22+">
</p>

<p align="center">
  <a href="https://ceilord.com">Website</a> ·
  <a href="https://ceilord.com#access"><strong>Request private access</strong></a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## What is Ceilord?

Ceilord is a from-scratch AI writing system focused on producing strong long-form writing from learned human-writing behavior.

**Access is private.** Ceilord is currently opening the product in small batches through private access. A developer API and SDK are planned but are not public yet.

> **Important:** this repository is the open-source web and signup layer around Ceilord. The writing engine itself is not open source and is not included here.

## What is in this repository?

| Included | Not included |
| --- | --- |
| Public website and legal pages | Writing engine and prompts |
| Private-beta signup flow | Training or reference-writing data |
| Cloudflare Worker for signup handling | Hosted Ceilord application |
| Turso/libSQL migrations | Ceilord API or SDK |
| Deployment and security tooling | Production credentials or user data |

If you clone this repository today, you can run and inspect the public site and beta-signup infrastructure. You cannot run the Ceilord writing model locally from this codebase.

## Quick start

Requires **Node.js 22 or newer**.

```sh
git clone https://github.com/ceilord/ceilord.git
cd ceilord
npm ci
npm run landing
```

Open `http://127.0.0.1:4770`.

The local preview keeps beta requests in `~/.ceilord/beta-signups.jsonl`, so the signup flow works without a Cloudflare or Turso account.

Run the repository checks with:

```sh
npm run check
```

## How the public stack works

```mermaid
flowchart LR
    B["Browser"] --> W["Cloudflare Worker"]
    W --> S["Static site"]
    W --> A["POST /api/beta"]
    A --> D[("Turso / libSQL")]
    A --> E["Confirmation email"]
```

The public stack is deliberately small:

- `site/` contains the static website, legal pages, styles, and client-side JavaScript.
- `src/worker.ts` serves the site and handles `POST /api/beta`.
- beta requests require explicit consent and are stored with the accepted notice version.
- duplicate addresses receive the same public response as new addresses, reducing list-probing risk.
- production database credentials live in Cloudflare secrets, never in tracked files.

## Project layout

| Path | Purpose |
| --- | --- |
| `site/` | Public site, blog, legal pages, styles, and scripts |
| `src/worker.ts` | Cloudflare Worker and beta-signup endpoint |
| `src/db.ts` | Database connection helper |
| `src/landingServer.ts` | Local preview server |
| `migrations/` | Public database schema changes |
| `scripts/` | Deployment, migration, vendoring, and security checks |
| `wrangler.jsonc` | Cloudflare Workers configuration |

## Deploying your own copy

The public site and signup Worker are designed for Cloudflare Workers Static Assets with Turso/libSQL persistence.

Set secrets through Wrangler rather than committing them:

```sh
npx wrangler secret put TURSO_DATABASE_URL --env=
npx wrangler secret put TURSO_AUTH_TOKEN --env=
```

`RESEND_API_KEY` is optional and enables the confirmation email when configured.

Then migrate the explicitly selected database and deploy:

```sh
set -a; source .dev.vars; set +a
npm run db:migrate
npm run cf:deploy
```

See [CLOUDFLARE.md](CLOUDFLARE.md) for environment-specific setup and deployment guards.

## Security

Do not open public issues for suspected vulnerabilities or exposed credentials. Follow [SECURITY.md](SECURITY.md) for private reporting instructions.

The repository includes checks for secret leakage and production dependency issues:

```sh
npm run security:secrets
npm run security:deps
```

## Contributing

Small, focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening one.

## License

[MIT](LICENSE). The Ceilord name and logo are not granted for reuse by the software license.
