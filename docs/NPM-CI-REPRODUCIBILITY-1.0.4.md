# Ya Ali 1.0.4 — npm ci Reproducibility

## Root cause found in the source tree

The root `package.json` declared `@types/node`, while the root `packages[""]` entry in `package-lock.json` did not contain that declaration. The lockfile already contained the resolved `node_modules/@types/node` package, so the mismatch was a lock metadata defect rather than a missing package payload.

This has been corrected. A direct package-vs-lock comparison now reports every root dependency as `MATCH`.

## Reproducible install policy

`.npmrc` now pins the public npm registry and enables bounded retries, a 120-second fetch timeout, offline preference, and disabled audit/fund network calls during install. CI uses:

```bash
npm ci --prefer-offline --no-audit --no-fund
```

GitHub Actions also enables `actions/setup-node` npm caching before installation.

## Important distinction

`npm ci` still requires access to the registry when a required tarball is not already present in the npm cache. The current analysis container has DNS/network access disabled: `registry.npmjs.org` cannot be resolved. Therefore a real network-backed `npm ci` cannot honestly be marked PASS in this environment.

This is different from a lockfile failure. The offline dry-run reaches dependency resolution and fails with `ENOTCACHED` because the container has an empty npm cache.

## Verification contract

Before release, run:

```bash
npm ci --prefer-offline --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

Android CI additionally runs Capacitor sync and a debug APK build.
