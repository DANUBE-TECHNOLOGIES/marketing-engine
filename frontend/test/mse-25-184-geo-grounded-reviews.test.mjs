import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reviews = readFileSync(
  new URL("../components/public-site/renderers/ReviewsRenderer.js", import.meta.url),
  "utf8"
);

test("MSE-25.184 reviews do not invent synchronization state or anonymous author identity", () => {
  assert.doesNotMatch(reviews, /seront bientôt affichés ici/);
  assert.doesNotMatch(reviews, /en cours de synchronisation avec Google Business Profile/);
  assert.doesNotMatch(reviews, /authorName \|\| "Voyageur"/);
  assert.doesNotMatch(reviews, /authorName \|\| "V"/);
});

test("MSE-25.184 related review navigation is published-only", () => {
  assert.match(reviews, /uniquePublishedNavigation\(site\)/);
  assert.match(reviews, /pageSlug\(page\)/);
  assert.match(reviews, /pageHref\(site\.slug, page\)/);
  assert.doesNotMatch(reviews, /siteHref\(site, "services"\)/);
  assert.doesNotMatch(reviews, /siteHref\(site, "contact"\)/);
});

test("MSE-25.184 empty ungrounded review sections disappear", () => {
  assert.match(reviews, /if \(!hasPublishedReviewData && !reviewUrl && !introduction\) return null/);
  assert.match(reviews, /reviews\.length \? \(/);
  assert.match(reviews, /\) : null/);
});
