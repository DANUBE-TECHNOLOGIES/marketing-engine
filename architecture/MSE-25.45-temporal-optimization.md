# MSE-25.45 — Temporal Conversion Optimization

## Objective

Extend the first-party conversion engine with a read-only temporal decision layer. The engine compares equal adjacent periods, ranks comparable agency pages across the network, and surfaces only evidence-backed improvement or degradation signals.

## Invariants

- No public page, CTA, block, copy or payment configuration is mutated automatically.
- No additional personal data is collected.
- MSE-25.43 remains the canonical append-only event source.
- MSE-25.44 trust/payment bands remain untouched.
- Current and previous periods have identical duration.
- A temporal comparison is considered usable only when both periods have at least 40 page views for the same agency/page pair.
- A temporal movement is considered meaningful only when the absolute conversion-rate movement is at least 2 percentage points and the relative movement is at least 20% when a relative baseline is computable.

## Output contract

`GET /api/conversions/summary?days=N` keeps the MSE-25.43/25.45 phase-1 output and adds a `temporal` object containing:

- current and previous date windows;
- current vs previous global page views, interactions and conversion-rate movement;
- page-level comparable trends (`improving`, `degrading`, `stable`, `insufficient`);
- degradation priorities;
- current-period network rankings by page type;
- evidence counts.

## Network ranking

Only pages with at least 40 current-period page views participate. Ranking is scoped by `pageSlug`, ordered by interaction/conversion rate, then page views. Rankings are informative only and never trigger a write.

## Cockpit

`/conversion-intent` displays:

- period-over-period network indicators;
- comparable page trends;
- degradation and confirmed improvement panels;
- current network ranking by comparable page type;
- existing phase-1 optimization opportunities and reference pages.

## Deployment

No database migration is required. Backend restart and frontend rebuild are required because both the summary service and cockpit change.
