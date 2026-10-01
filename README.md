<h1 align="center">Ceilord</h1>

<p align="center"><strong>An AI writing system built to learn from how real people write.</strong></p>

<p align="center">
  <a href="https://github.com/ceilord/ceilord/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ceilord/ceilord/ci.yml?branch=master&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-black" alt="Node 22+">
  <img src="https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-black" alt="Cloudflare Workers">
</p>

<p align="center">
  <a href="https://ceilord.com">Website</a> ·
  <a href="CLOUDFLARE.md">Deploy</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

Ceilord is a from-scratch AI writing system aimed at strong long-form writing, learned from real human writing behavior instead of generating a draft and rewriting it afterward to sound human. It is offered two ways: as a hosted API for developers who want to build writing products (a study app, a tutoring tool, a content workflow), and as a hosted app for people who just want finished writing.

**Status: private beta.** Access opens in small batches. You can [request access at ceilord.com](https://ceilord.com).

## What this repository is

This is the **open core**: the public parts of Ceilord that anyone can read, run, and adapt.

| In this repo | Not in this repo |
| --- | --- |
| The public site and early-access page (`site/`) | The writing model and its prompts |
| The signup Worker and consent handling (`src/worker.ts`) | Training and reference writing data |
| Database migrations (`migrations/`) | The hosted web and mobile apps |
| Deployment and security scripts (`scripts/`) | API keys, billing, and account systems |

The writing model is reached through the hosted Ceilord API. The client libraries and examples for that API will live here once the API opens to developers.

## How it fits together

```text
Browser ──> Cloudflare Worker (static site + /api/beta) ──> Turso database
                     │
                     └──> Resend (one-time confirmation email)
```

- The site in `site/` is static HTML, CSS, and a little JavaScript, served by Cloudflare Workers Static Assets.
- `POST /api/beta` validates the email, requires explicit consent, rate limits per IP, and stores the request with the version of the notice that was accepted.
- Duplicate emails get the same response as new ones, so the list can't be probed.
- New addresses get a short confirmation email from `hello@ceilord.com`.

## Quick start

Requires Node 22 or newer.

```sh
git clone https://github.com/ceilord/ceilord.git
cd ceilord
npm ci
npm run landing      # static site on http://127.0.0.1:4770
npm run check        # typecheck
```

`npm run landing` stores signups in a local file (`~/.ceilord/beta-signups.jsonl`), so you can try the form without any cloud account.

## Deploy your own copy

The Worker and site deploy to Cloudflare with the pinned Wrangler CLI.

```sh
npx wrangler secret put TURSO_DATABASE_URL --env=
npx wrangler secret put TURSO_AUTH_TOKEN --env=
npx wrangler secret put RESEND_API_KEY --env=
DATABASE_URL=... npm run db:migrate
npm run cf:deploy
```

Full steps, environments, and the deploy guard are in [CLOUDFLARE.md](CLOUDFLARE.md). Never commit credentials; `npm run security:secrets` scans the Git history for them.

## Project layout

| Path | What it is |
| --- | --- |
| `site/` | Public site, legal pages, styles, and scripts |
| `src/worker.ts` | Early-access API (validation, consent, rate limit, email) |
| `src/db.ts` | Database connection helper |
| `src/landingServer.ts` | Local preview server |
| `migrations/` | SQL schema changes |
| `scripts/` | Deploy checks, migrations, secret scan |
| `wrangler.jsonc` | Cloudflare configuration for production, dev, and staging |

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Please do not open public issues for security problems.

## Contributing

Small, focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE). The Ceilord name and logo are not covered by the license.
