# Security Policy

Do not open a public issue for a suspected vulnerability or exposed credential.

Report security issues privately to `support@ceilord.com` with `SECURITY` in the subject. Include the affected component, reproduction steps, and the potential impact. Do not include real user data unless it is necessary to demonstrate the issue.

Ceilord does not intentionally commit production credentials. Cloudflare and database credentials must be stored in platform secret stores or ignored local environment files. If a credential is ever committed, treat it as compromised: rotate it first, then remove it from reachable history before publishing the repository.

Security fixes may be disclosed after affected deployments and supported versions have been patched.
