import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../components/public-site/renderers/ReviewsRenderer.js", import.meta.url), "utf8");
const provenance = readFileSync(new URL("../lib/seo/google-review-provenance.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../lib/public-reviews-api.js", import.meta.url), "utf8");

test("MSE-25.150 uses backend review summary rather than recomputing aggregate rating from visible cards", () => {
  assert.match(renderer, /normalizeGoogleReviewSummary\(data\?\.summary\)/);
  assert.match(renderer, /const averageRating = summary\.averageRating/);
  assert.match(renderer, /const total = summary\.total/);
  assert.doesNotMatch(renderer, /reviews\.reduce\([^)]*rating/);
  assert.doesNotMatch(renderer, /reviews\.length\s*;\s*\n\s*const averageRating/);
});

test("MSE-25.150 keeps source and freshness explicit with a five-minute public API cache", () => {
  assert.match(renderer, /data-review-source="google-business-profile"/);
  assert.match(renderer, /Source : Google Business Profile/);
  assert.match(renderer, /Dernier avis Google synchronisé/);
  assert.match(provenance, /synchronized-summary/);
  assert.match(provenance, /visible-subset/);
  assert.match(api, /revalidate:\s*300/);
});

test("MSE-25.150 rejects self-serving review rich-result markup on the agency", () => {
  assert.match(provenance, /emitAggregateRatingOnAgency:\s*false/);
  assert.match(provenance, /emitReviewOnAgency:\s*false/);
  assert.doesNotMatch(renderer, /AggregateRating/);
  assert.doesNotMatch(renderer, /"@type"\s*:\s*"Review"/);
});

test("MSE-25.150 default copy only claims that Google reviews are published for the agency", () => {
  assert.match(renderer, /avis Google publiés pour notre agence/);
  assert.doesNotMatch(renderer, /voyageurs accompagnés par notre agence/);
});
