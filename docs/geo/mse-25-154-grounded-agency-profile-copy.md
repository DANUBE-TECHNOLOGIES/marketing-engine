# MSE-25.154 — GEO grounded agency profile copy V1

## Goal

Keep the default agency profile copy limited to facts the mini-site can demonstrate directly: agency identity, city, public contact information, opening hours and configured local coverage.

## Changes

The default `AgencyV2Renderer` introduction no longer auto-claims:

- a fixed catalogue of stays, tours, cruises or tailor-made trips;
- advisory expertise not sourced from the current page;
- support before, during and after travel.

It now describes the public agency information actually rendered and, where configured, the local sectors returned by `resolvedTargetCities()`.

## Scope

This does not change explicit editor-authored copy (`content.text` / `content.description`) and does not alter institutional reassurance claims such as CEDIV, Atout France or financial guarantee references. Those require a separate authority/provenance audit.

Mini-sites GEO only. No AI agent, Orchestra or Knowledge/remediation changes.
