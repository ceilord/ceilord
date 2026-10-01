# Cloudflare hosting

Ceilord's public site uses Cloudflare Workers Static Assets for `site/` and `src/worker.ts` for `POST /api/beta`. Production signup persistence is Turso/libSQL. `wrangler.jsonc` is the deployment source of truth.

## Secrets and database

Never commit database credentials. Local development uses ignored `.dev.vars`; Cloudflare stores production values as Worker secrets:

```sh
npx wrangler secret put TURSO_DATABASE_URL --env=
npx wrangler secret put TURSO_AUTH_TOKEN --env=
```

Apply schema migrations only after explicitly selecting the intended Turso database in your environment:

```sh
set -a; source .dev.vars; set +a
npm run db:migrate
```

Production, `dev`, and `staging` must not share credentials. `ceilord-dev` and `ceilord-staging` require separate non-production Turso databases/tokens before they can be deployed. The deployment guard intentionally blocks an environment whose required secret names are absent.

## Deployments

```sh
npm run cf:deploy          # production
npm run cf:deploy:dev      # dev, after non-production secrets exist
npm run cf:deploy:staging  # staging, after non-production secrets exist
```

Production owns `ceilord.com` and `www.ceilord.com`. Non-production environments have no production routes. Feature branches and preview deployments must never receive production Turso credentials.

Before a production deploy, run `npm run check` and verify that the deployed version corresponds to a reviewed Git commit. Do not deploy an uncommitted working tree as the long-term production source of truth.
