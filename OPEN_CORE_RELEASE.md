# Open-core release boundary

Do not make the existing private GitHub repository public in place. Its historical objects contain deleted internal research, recovered-session notes, experimental architectures, and other material that is outside the intended public core.

Create the public repository from a clean snapshot with fresh Git history. The intended release snapshot may include runtime source, tests, migrations, first-party public-site assets, package manifests, public deployment documentation, and community/security files. Third-party browser bundles in `site/vendor/` are regenerated from npm dependencies and are not included in the public source snapshot. Exclude internal operating instructions, marketing research/foundation material, historical worktrees, local tools, credentials, databases, exports, recovered sessions, and superseded architecture documents.

Before publishing a snapshot:

1. choose and add the intended open-source license;
2. run `npm ci`, `npm run check`, and `npm audit --omit=dev --audit-level=high`;
3. scan the snapshot and its new Git history for credentials;
4. confirm no production user data is present;
5. confirm deployment docs describe Turso rather than the retired D1 setup;
6. enable GitHub secret scanning, Dependabot alerts, code scanning, and protected/default-branch review rules after the public repository is created.

The absence of a `LICENSE` file means no public release is authorized yet. License selection is an explicit founder/legal decision and must not be guessed by automation.
