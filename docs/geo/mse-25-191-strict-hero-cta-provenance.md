# MSE-25.191 — GEO strict hero CTA provenance V1

## Problem

`HeroV2Renderer` still accepted legacy button labels without explicit hrefs and supplied fallback slugs such as `contact` and `destinations` to the shared CTA resolver. A visible CTA could therefore point to a route that was not explicitly published by the hero content.

## Contract

- Hero actions require a structured CTA with both an explicit label and an explicit href.
- Legacy `primaryButton` and `secondaryButton` labels do not create navigation.
- No hero CTA fallback route is synthesized from `contact`, `destinations`, a label, or showcase wording.
- Unsafe explicit schemes continue to be rejected by the shared resolver.
- Factual hero copy, image behavior and explicitly configured hrefs are preserved.
