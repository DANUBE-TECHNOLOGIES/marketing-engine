# MSE-25.156 — GEO legal reassurance runtime V1

## Goal

Reconnect public legal reassurance to the authoritative public brand/legal runtime after removing hard-coded legal provider claims in MSE-25.155.

## Data flow

`fetchPublicBrandLegalRuntime(siteSlug)` → `runtimeLegalValues(runtime)` → `PublicReassuranceBand`.

The reassurance band can now expose only these explicit public legal values:

- `travelRegistration` → “Immatriculation tourisme”;
- `financialGuarantee` → “Garantie financière”;
- `professionalInsurance` → “Assurance professionnelle”.

A card is omitted when its corresponding value is absent or blank.

## Provider identity

The frontend does not infer Atout France, Groupama or any other provider from the semantic meaning of a legal field. If a provider name is present, it is displayed only because it is part of the public legal value itself.

CEDIV Travel and Les Entreprises du Voyage remain separate network affiliation references. Payment methods remain unchanged.

## Runtime behavior

The page render now loads the public brand/legal runtime alongside the site/page contract. The same runtime instance is reused for legal pages and the reassurance band, avoiding a second legal fetch during rendering.

## Scope

Mini-sites GEO only. No AI agent, Orchestra or Knowledge/remediation changes.
