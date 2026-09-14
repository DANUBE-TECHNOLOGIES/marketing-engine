# MSE-25.148 — GEO agency partner selection V1

## Goal

Represent the explicit local-agency partner selection without asserting a Schema.org relationship that does not exist semantically.

## Source contract

The visible partner directory and GEO layer now share `selectedAgencyPartners(site)`.

The GEO layer narrows this visible selection further through `verifiedCatalogAgencyPartners(site)`:

- the partner must come from the explicit `agencyPartners` configuration;
- it must resolve to a canonical, publication-ready catalogue partner;
- it must survive the same network de-duplication and maximum-three selection used by the visible renderer;
- custom partners without a verified catalogue identity remain visible when configured but are not promoted to canonical GEO entities.

## Semantics

The agency-specific selection is emitted as an `ItemList` named `Partenaires sélectionnés par <agence>` and `about` the canonical local `TravelAgency#travel-agency`.

Each list item reuses the same page-scoped `Organization#partner-*` identity already emitted by the public partner catalogue.

We deliberately do not use `memberOf`, `sponsor`, `owns`, `brand`, `knowsAbout` or any property that would overstate the commercial relationship. Presence in this list means only that the partner is explicitly selected in the agency configuration and has a verified public catalogue identity.

## Scope

Mini-site GEO only. No AI-agent, OpenAI Realtime, Orchestra, pricing, availability, stock or booking authority changes.
