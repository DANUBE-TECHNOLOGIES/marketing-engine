# MSE-25.150 — GEO Google reviews parity V1

## Goal

Keep Google review facts visible, fresh and attributable without generating self-serving review rich-result markup for Mondescale agency pages.

## Public source contract

The frontend review renderer consumes `/public/agency-sites/:siteSlug/reviews` through `getPublicReviews()` with a five-minute revalidation window. The visible aggregate uses `data.summary.averageRating` and `data.summary.total`; it is never recomputed from the limited 3/6 review cards rendered on a page.

Freshness prefers `summary.latestPublishedAt`. Only when that summary timestamp is absent may the renderer fall back to the latest date among the visible subset, and the label explicitly distinguishes the two scopes.

## Search policy

Google Search Central states that LocalBusiness/Organization pages controlled by the reviewed entity are ineligible for the star review feature when the entity marks up reviews about itself, including reviews embedded from third-party providers such as Google Business reviews.

For that reason this GEO layer deliberately does not emit `AggregateRating` or `Review` structured data on the Mondescale `TravelAgency` entity. Schema.org technically supports these properties on Organization/Place, but Search eligibility and source semantics take precedence over adding markup for its own sake.

## Visible provenance

The review section exposes:

- `data-review-source="google-business-profile"`;
- the visible label `Source : Google Business Profile`;
- aggregate rating and count from the backend summary;
- synchronized-summary freshness when available;
- visible-subset freshness only as an explicit fallback.

## Scope

Mini-site GEO only. No Google review synchronization behavior, AI agent, Orchestra or Knowledge/remediation changes.
