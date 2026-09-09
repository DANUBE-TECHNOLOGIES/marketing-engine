# MSE-25.151 — GEO Google review summary authority V1

## Goal

Make review freshness authoritative at the same level as rating and count: the complete synchronized review snapshot, before any UI card limit.

## Backend contract

`GoogleBusinessReviewsService.getPublic()` already selects a complete public set before applying the display limit:

- synchronized Google reviews are preferred when a Google snapshot exists;
- historical Google duplicates are deduplicated by `googleReviewId`;
- `summary.total` and `summary.averageRating` are computed on that complete set;
- only `reviews` is sliced to the requested 3/6 cards.

MSE-25.151 adds `summary.latestPublishedAt`, computed on the same complete set before slicing. Invalid dates are ignored; `createdAt` is used when `publishedAt` is absent.

## Frontend consequence

MSE-25.150 can now distinguish a true synchronized-summary freshness timestamp from its defensive visible-subset fallback. Rating, count and freshness therefore share the same public authority boundary.

## Scope

No Google provider call during public rendering, no review deletion, no rating rich-result markup, no AI agent, Orchestra or Knowledge/remediation changes.
