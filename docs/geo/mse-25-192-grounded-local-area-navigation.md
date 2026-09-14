# MSE-25.192 — GEO grounded local area navigation V1

## Problem

`LocalSeoAreaLinks` still generated fixed links to `/services`, `/destinations`, `/inspiration` and `/contact` from the agency root, even when those pages were not present in the published navigation.

That could expose routes with no published page authority and contradicted the grounded-navigation rules already applied to the header, footer and section renderers.

## Contract

- Local-area related links come only from `uniquePublishedNavigation(site)`.
- Link URLs are produced by canonical `pageHref(site.slug, page)`.
- Link labels reuse the published page title.
- Home/root entries are excluded from the related-page list.
- No fixed service, destination, inspiration or contact route is generated.
- If no related page is published, the related navigation block is omitted.
- Local geographic copy remains limited to explicitly configured target cities and the agency's actual implantation.

## Scope

Public Mondescale mini-sites GEO only. No agent, Orchestra, Knowledge or remediation changes.
