# MSE-25.147 — GEO partner directory V1

## Goal

Expose the public Mondescale partner catalogue as a machine-readable collection without turning catalogue presence into an agency expertise, recommendation, availability or commercial promise.

## Source contract

The GEO graph reuses the exact publication gate already used by `PartnerDirectoryRenderer`:

`getPartnerDirectoryCategories()` → `getPublishablePartnerProfiles()`.

A partner blocked for identity review, catalogue exclusion or insufficient public content is therefore absent from both the visible directory and the GEO collection.

## Semantics

On partner pages only:

- the canonical WebPage identity is additionally typed as `CollectionPage`;
- its `mainEntity` is a stable `ItemList`;
- each published catalogue entry is represented as an `Organization` with a page-scoped stable `@id`;
- only the published name, summary and catalogue category are emitted.

The graph deliberately does not emit `knowsAbout`, `offers`, prices, availability, stock, booking claims, or agency-specific expertise from partner metadata.

## Scope

Mini-site GEO only. No OpenAI Realtime, AI-agent, Orchestra, Knowledge/remediation or transactional authority changes.
