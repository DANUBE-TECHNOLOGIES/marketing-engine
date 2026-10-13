# MSE-25.322 — Ambassade FRAM

## Scope and rollout
Implement centralized Ambassade FRAM editorial content and offers, with agency opt-in only. No automatic activation for all agencies. Melun is the first proposed pilot, subject to confirming agency eligibility and rights to use FRAM brand assets.

## Verified business rules provided by network
- Free loyalty card, valid five calendar years.
- Eligible FRAM stays/circuits (Plein Vent excluded): 100 EUR spend = 1 point.
- Thresholds: 40 points = 3%, 60 = 5%, 100 = 7%, 150 = 10%.
- Redemption, combinability and exclusions must be confirmed with FRAM. The simulator **must not** promise a discount on a particular booking.
- Four monthly Exclus Ambassade FRAM products; access to flash sales; FRAM production expertise.

## Proposed architecture (integration pending)
- Prisma: FramAmbassadorAgency (agencyId unique, enabled, approvedAt), FramOffer (type, status, title, description, image, terms, startAt, endAt, updatedAt), FramOfferAgency for optional targeting; admin audit trail.
- Authenticated backend CRUD with validation, approval, optimistic concurrency, role checks and image URL policy; public read-only API limited to published in-date offers.
- Frontend: /ambassade-fram and /agence/[siteSlug]/ambassade-fram, canonical URLs, SEO metadata, FAQ, structured data, sitemap inclusion for enabled agencies only, request-quote CTA.
- Admin: central editor, preview, scheduling, four monthly slots, expiration, archive, audit log.
- Media: use only supplied/authorized FRAM logos and licensed images.
- Cache: explicit invalidation on publish/unpublish, and time-based expiration (do not allow stale flash sales).
- No personal loyalty account or individual points ledger in this phase.

## Release gates
1. Inspect actual backend route, auth, agency-site and Prisma patterns before integrating.
2. Add Prisma migration and backfill with **all agency flags disabled**.
3. Verify admin authorization, no tenant leakage, offer time boundaries, escaping and URL validation.
4. Run backend and frontend test suites, build, and SEO regressions in CI.
5. VM 102 preflight: disk free space, DB backup, Docker image rollback, network health.
6. Deploy a smoke container on alternate port; test 200/404, sitemap, metadata, auth, and offer expiration.
7. Only after explicit go-ahead, migrate and swap production with rollback ready.

## Initial implementation
The standalone, dependency-free loyalty and offer-filtering functions are in frontend/lib/ambassade-fram and have node:test coverage. They do **not** alter production routing or data.
