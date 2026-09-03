# MSE-25.75 — Production indexability handoff

## Purpose

MSE-25.75 closes the gap between the validated MSE-25.74 code and the real VM runtime. It is strictly read-only: no Search Console write, sitemap submission, page mutation, automatic remediation, or Website Designer mutation is allowed.

Required MSE-25.74 merge commit:

`733a48529ca4e8fdc91e34f2a5633a857a3e4dfd`

## VM command

From the repository root on the production VM:

```bash
cd backend
node scripts/mse-25-75-production-indexability-handoff.js
```

Defaults:

- backend runtime: `http://127.0.0.1:4000`
- public mini-site origin: `PUBLIC_SITE_ORIGIN`, otherwise `https://agences.mondescale.com`
- timeout: 10 seconds

Optional overrides:

```bash
MSE_25_75_BACKEND_URL=http://127.0.0.1:4000 \
MSE_25_75_TIMEOUT_MS=15000 \
node scripts/mse-25-75-production-indexability-handoff.js
```

If the backend route requires identity/authentication headers, pass only the required runtime headers as JSON through the environment; never commit credentials:

```bash
MSE_25_75_HEADERS_JSON='{"X-...":"..."}' \
node scripts/mse-25-75-production-indexability-handoff.js
```

## Verdicts

- `PRODUCTION_READY`: MSE-25.74 is deployed, backend routes answer, public sitemap is available, and runtime indexability has no blocker.
- `PRODUCTION_READY_WAITING_FOR_SEARCH_CONSOLE_DATA`: production is technically indexable; Google has not produced usable Search Console demand data yet.
- `RUNTIME_NOT_DEPLOYED`: the VM does not contain the required MSE-25.74 commit and/or the runtime-readiness route is still absent.
- `AUTH_REQUIRED`: runtime is reachable but the probe needs the normal identity/authentication headers.
- `BLOCKED_INDEXABILITY`: the live MSE-25.74 audit found concrete indexability blockers. Use its `blockers`, `summary`, sitemap, robots and page observations as the remediation source.
- `PRODUCTION_VALIDATION_FAILED`: infrastructure/runtime/public-surface validation failed for another reason.

The command exits with status `0` only for production-ready verdicts and with status `1` otherwise.

## Validation scope

The probe checks in parallel:

1. current repository HEAD and ancestry of the required MSE-25.74 merge commit;
2. `GET /search-console-submissions/health` on the local backend;
3. `GET /search-console-submissions/runtime-readiness` on the local backend;
4. public `sitemap.xml` availability;
5. public `robots.txt` availability (404 remains allow-by-default and is not a blocker).

The runtime-readiness response remains the authoritative source for indexability blockers such as missing sitemap URLs, local indexability issues, HTTP/canonical/noindex/robots problems, or unavailable public pages.

## Closure rule

MSE-25.75 can be closed only when the VM output is either:

- `PRODUCTION_READY`, or
- `PRODUCTION_READY_WAITING_FOR_SEARCH_CONSOLE_DATA`.

A `BLOCKED_INDEXABILITY` verdict opens a remediation iteration based on the returned blocker list; it must not trigger automatic page or Google writes.
