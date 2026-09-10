# MSE-25.194 — GEO managed special navigation V1

## Problem

The strict grounded-navigation work through MSE-25.193 correctly removed routes fabricated from labels or assumed page slugs. Two legitimate application routes disappeared from the global mini-site navigation as a side effect: Groupes and Voyages d’affaires. The home hero action “Construire mon voyage” also needs a deliberate Contact target without restoring legacy label-derived routing.

## Contract

- Published mini-site pages remain sourced only from `uniquePublishedNavigation(site)`.
- Two application routes are explicitly managed by code and may be appended to the global navigation:
  - `Groupes` → `/agence/{siteSlug}/voyages-en-groupe`
  - `Voyages d’affaires` → `/agence/{siteSlug}/business-travel`
- Managed routes are declared as label + slug pairs; no label-to-slug inference is permitted.
- A managed route is not duplicated when the same href is already present in published navigation.
- The home hero may expose the managed CTA `Construire mon voyage` with the explicit href `/contact`.
- The managed home CTA is constructed through the same safe explicit-href resolver as configured CTAs.
- Explicit configured primary hero CTA content keeps precedence over the managed home Contact CTA.
- Legacy `primaryButton` / `secondaryButton` labels remain unable to create navigation.
- No generic Contact, services, destinations or inspiration fallback is restored.

## Scope

Public Mondescale mini-sites GEO only. This is a narrow managed-route exception layered on top of MSE-25.193. No agent, Orchestra, Knowledge, Local Engine or remediation change.
