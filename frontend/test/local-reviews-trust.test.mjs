import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const reviews = await readFile(
  new URL("../components/public-site/renderers/ReviewsRenderer.js", import.meta.url),
  "utf8"
);
const jsonLd = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);

test("review section uses a locally contextualized fallback heading", () => {
  assert.match(reviews, /Les avis clients de notre agence à \$\{city\}/);
  assert.match(reviews, /getSectionTitle/);
});

test("review publication dates use semantic time markup", () => {
  assert.match(reviews, /<time dateTime=\{review\.publishedAt\}>/);
});

test("review action URL is not declared as an identity sameAs URL", () => {
  const sameAs = jsonLd.match(/sameAs:\s*\[([\s\S]*?)\]\.filter\(Boolean\)/)?.[1] || "";
  assert.doesNotMatch(sameAs, /googleReviewUrl/);
  assert.match(sameAs, /googleBusinessUrl/);
  assert.match(sameAs, /googleMapsUrl/);
});

test("reviews remain visibly attributed to Google without aggregateRating schema injection", () => {
  assert.match(reviews, /Avis Google/);
  assert.doesNotMatch(jsonLd, /aggregateRating/);
});
