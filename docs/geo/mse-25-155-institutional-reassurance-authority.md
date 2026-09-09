# MSE-25.155 — GEO institutional reassurance authority V1

## Goal

Prevent legal reassurance claims from being published from hard-coded frontend constants when a dedicated legal profile already exists as the authority for those facts.

## Authority boundary

The public legal runtime resolves dedicated fields for:

- `travelRegistration`;
- `financialGuarantee`;
- `professionalInsurance`.

Until the reassurance band is wired to those runtime values, it must not hard-code Atout France, Groupama, registration, financial guarantee or professional insurance claims.

## Changes

- hard-coded Atout France and Groupama cards removed from the public reassurance band;
- trust wording narrowed from “Garanties & affiliations” to network affiliations only;
- CEDIV Travel and Les Entreprises du Voyage remain separate network-affiliation references;
- payment-method display is unchanged;
- a canonical CI contract verifies that legal claims remain backed by the central legal authority rather than reappearing as frontend constants.

## Next step

Reintroduce registration / guarantee / insurance reassurance only from `runtimeLegalValues()` once the public band is connected to the legal runtime.

Mini-sites GEO only. No AI agent, Orchestra or Knowledge/remediation changes.
