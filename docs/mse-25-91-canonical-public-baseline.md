# MSE-25.91 — Canonical public baseline

Date: 2026-08-29

## Canonical references

- Working branch: `integration/mse-25-91-canonical-public-reconvergence-20260829`
- Frozen reference: `release/mse-25-91-public-canonical-20260829`
- Production backend source: `/home/admin1/mondescale-local-engine/backend`
- Public frontend runtime backend DNS: `http://backend:4000`
- Public mini-site probe: `ambassade-fram-mondescale-bois-colombes`

## Public rendering ownership

- Header: `frontend/components/public-site/PublicSiteHeader.js`
- Brand logo: `frontend/components/public-site/PublicBrandLogo.js`
- Header logo geometry lock: `frontend/components/public-site/mse-25-91-final-public-fixes.css`
- Home hero renderer: `frontend/components/public-site/renderers/HeroV2Renderer.js`
- Home hero geometry: `frontend/components/public-site/network-home-hero.css`
- Team renderer: `frontend/components/public-site/renderers/TeamRenderer.js`
- Team media hydration: `backend/src/modules/public-site-read/team-media-hydrator.js`
- Partner renderer: `frontend/components/public-site/renderers/PartnersRenderer.js`
- Payment/reassurance renderer: `frontend/components/public-site/PublicReassuranceBand.js`
- Backend media public proxy: `frontend/next.config.js`

## Retired public implementations

The following implementations are retired and must not be reintroduced:

- `frontend/components/public-site/logo-emphasis.css`
- `frontend/components/public-site/PublicPaymentMethodsBand.js`
- frontend runtime DNS `http://mle-backend:4000`
- backend deployment from `/home/admin1/worktrees/mse-25-convergence/backend`

The following branches are historical only and must not be used as a new public frontend base:

- `feature/mse-25-87-public-regression-fixes-20260829`
- `integration/mse-25-77-public-experience-reconvergence-20260828`
- `feature/mse-25-86-seo-coverage-remediation-20260828`
- `feature/mse-25-86-seo-coverage-remediation-on-85-20260828`

MSE-25.86 SEO remediation source and tests remain preserved inside the canonical branch. Its already-applied production SEO content must not be rolled back by frontend cleanup.

## Mandatory guards

Before any canonical public deployment:

1. `node scripts/mse-25-91-canonical-drift-check.js`
2. `node --test frontend/test/mse-25-91-canonical-public-reconvergence.test.mjs`
3. real public team portrait preflight
4. frontend build
5. frontend -> backend DNS health probe
6. real mini-site SSR probe
7. post-switch team portrait preflight

The deployment script `scripts/mse-25-91-vm-deploy.sh` owns this sequence.

## Validated visual invariants

- Mondescale company logo is prominent, fully visible and does not overlap agency identity.
- Home hero is contained, centered, rounded and does not span the full viewport on wide displays.
- Hero copy and both CTAs remain fully visible.
- Team portraits are hydrated from the Asset Engine and served through same-origin `/media/...` paths.
- Partner experience remains present.
- Payment/reassurance is rendered once through `PublicReassuranceBand`.
- Showcase CTAs use `https://www.mondescale.com` rather than bare `mondescale.com`.
