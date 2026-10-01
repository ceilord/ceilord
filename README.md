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

Ceilord is a from-scratch AI writing system aimed at strong long-form writing, learned from real human writing behavior instead of generating a draft and rewriting it afterward to sound human.

> **Private beta. Request access first.**
> Ceilord is not open to everyone yet. Access opens in small batches, and the beta is free with no card. It will become available to everyone later. **[Request private access at ceilord.com](https://ceilord.com)**.

## Two ways to use Ceilord

| | **Hosted app** | **Ceilord API (bring your own app and database)** |
| --- | --- | --- |
| For | Students and anyone who just wants finished writing | Developers building their own product, for example a SAT prep or tutoring app |
| How it works | Sign in on the web or mobile app and write | Your app and your database call the Ceilord API to write |
| Database | Managed by Ceilord | Yours, self-hosted and private |
| Cost | A subscription in the app | An API key from Ceilord |
| Available | Private beta, by request | Private beta, by request |

**Important:** self-hosting your own database does not mean self-hosting the writing model. The model is not open source and does not run on your machine. A self-hosted setup always needs the Ceilord API, so you need an API key from Ceilord to use it. Without a key, this repository does not write anything.

## What this repository is

This is the **open core**: the public parts of Ceilord that anyone can read, run, and adapt.

| In this repo | Not in this repo |
| --- | --- |
| The public site and early-access page (`site/`) | The writing model and its prompts |
| The signup Worker and consent handling (`src/worker.ts`) | Training and reference writing data |
| Database migrations (`migrations/`) | The hosted web and mobile apps |
| Deployment and security scripts (`scripts/`) | API keys, billing, and account systems |

The writing model is reached only through the hosted Ceilord API. Client libraries and examples for that API will live here once it opens to developers.

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
