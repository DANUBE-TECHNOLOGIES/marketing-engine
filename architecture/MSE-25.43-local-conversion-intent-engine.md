# MSE-25.43 — Local Conversion & Intent Engine

## Objective

Turn the consolidated public mini-sites into measurable commercial acquisition surfaces without introducing a dependency on a third-party analytics provider.

## First-party event contract

Every public conversion event must carry a deterministic, privacy-minimal context:

- `siteSlug` — public agency mini-site slug;
- `agencyId` — agency identifier when available;
- `pageSlug` — canonical public page slug (`home`, `services`, `destinations`, etc.);
- `pagePath` — public path at click time;
- `intent` — normalized commercial intent family;
- `action` — normalized conversion action;
- `placement` — stable renderer/CTA placement identifier;
- `label` — visible CTA label, truncated server-side;
- `target` — normalized destination class/value, never arbitrary client data;
- `occurredAt` — client event timestamp accepted only within a bounded window;
- `referrerPath` — same-origin path only when available.

No name, email address, phone number, free-form message, cookie identifier, IP address or user-agent is stored in the conversion event table.

## Initial action taxonomy

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

1. Public renderers annotate conversion-capable links with `data-conversion-*` attributes.
2. A single client-side capture component listens for clicks at the public-site root.
3. The capture component sends a non-blocking POST to the same-origin `/api/public-conversions/events` endpoint with `navigator.sendBeacon` when possible and `fetch(..., { keepalive: true })` as fallback.
4. The Next.js route proxies validated events to the backend public conversion endpoint.
5. The backend validates taxonomy/context and persists the event in PostgreSQL through Prisma.
6. A read-only summary endpoint provides aggregates by site/page/action/intent for Local Engine dashboards.

## Guardrails

- First-party only; no GA4 dependency.
- No PII in event payload or persistence.
- Tracking failure must never block navigation.
- No automatic mutation of public page content.
- Event endpoints are append-only for public callers.
- Dashboard aggregation is read-only.
- Home/PageBlock rendering invariants from MSE-25.42 remain unchanged.

## Phase 1 scope

- schema + migration;
- backend ingest and summary services/routes;
- frontend same-origin API proxy;
- shared conversion link attributes;
- root click capture;
- instrumentation of CTA, contact, payment, map, team and partner outbound surfaces;
- unit/contract tests.
