# MSE-25.43 — Local Conversion & Intent Engine

## Objective

Turn the consolidated public mini-sites into measurable commercial acquisition surfaces without introducing a dependency on a third-party analytics provider.

## First-party event contract

Every public event carries a deterministic, privacy-minimal context:

- `siteSlug` — public agency mini-site slug;
- `agencyId` — resolved server-side from the published mini-site;
- `pageSlug` — canonical public page slug (`home`, `services`, `destinations`, etc.);
- `pagePath` — public path at event time, without query string;
- `intent` — normalized commercial intent family;
- `action` — normalized event/conversion action;
- `placement` — stable renderer/CTA placement identifier;
- `label` — visible CTA label, truncated server-side when applicable;
- `target` — privacy-normalized destination class/value, never arbitrary client data;
- `occurredAt` — client event timestamp accepted only within a bounded window;
- `referrerPath` — same-origin path only when available.

No name, email address, phone number, free-form message, cookie identifier, IP address or user-agent is stored in the conversion event table.

## Initial action taxonomy

- `page_view` — denominator for first-party funnel baselines;
- `quote_request`
- `contact`
- `phone`
- `email`
- `directions`
- `appointment`
- `payment_options`
- `destination_explore`
- `service_explore`
- `advisor_contact`
- `partner_outbound`

## Initial intent taxonomy

- `general_travel`
- `flight_ticketing`
- `flexible_payment`
- `destination`
- `service`
- `advisor`
- `local_contact`
- `partners`

## Architecture

1. One client-side capture component is mounted once at the public agency-site layout.
2. It records one `page_view` per client navigation and listens for commercial link clicks at the public-site root.
3. Existing explicit conversion metadata remains compatible; otherwise action, intent and placement are inferred from stable public context.
4. The capture component sends a non-blocking POST to the same-origin `/api/public-conversions/[siteSlug]/events` endpoint with `navigator.sendBeacon` when possible and `fetch(..., { keepalive: true })` as fallback.
5. The Next.js route proxies events to the backend public conversion endpoint with tenant context.
6. The backend resolves the published site and agency, validates the closed taxonomy, strips PII-bearing target values and persists the event in PostgreSQL.
7. Anonymous public ingestion is bounded per mini-site without storing an IP identifier.
8. A read-only summary endpoint provides totals, page views, commercial interactions and interaction/view rate by site and page.
9. `/conversion-intent` exposes the first Local Engine manager dashboard for these first-party metrics.

## Compatibility

The pre-existing `TrackedConversionLink` / `dataLayer` shim used by Flexible Payment remains an optional analytics/export surface. MSE-25.43 does not depend on it and does not require GA4; the first-party event store is canonical for Local Engine conversion measurement.

## Guardrails

- First-party canonical storage; no GA4 dependency.
- No PII in persisted event context.
- Tracking failure must never block navigation.
- No automatic mutation of public page content.
- Event endpoints are append-only for public callers.
- Dashboard aggregation is read-only.
- Home/PageBlock rendering invariants from MSE-25.42 remain unchanged.

## Phase 1 scope

- first-party event migration;
- closed event and intent contract;
- backend ingest, bounded anonymous rate guard and summary service/routes;
- frontend same-origin event and summary proxies;
- root click capture plus `page_view` funnel baseline;
- CTA/contact/payment/map/team/destination/service/partner-outbound detection;
- manager dashboard `/conversion-intent`;
- unit/contract tests.
