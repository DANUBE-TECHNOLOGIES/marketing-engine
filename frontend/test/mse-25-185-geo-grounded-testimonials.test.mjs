import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(
  new URL("../components/public-site/renderers/TestimonialsRenderer.js", import.meta.url),
  "utf8"
);

test("MSE-25.185 testimonials do not invent ratings or trust claims", () => {
  assert.match(renderer, /function normalizedRating\(value\)/);
  assert.match(renderer, /if \(!Number\.isFinite\(parsed\)\) return null/);
  assert.doesNotMatch(renderer, /Number\(rating\) \|\| 5/);
  assert.doesNotMatch(renderer, /Ils nous font confiance/);
  assert.match(renderer, /getSectionTitle\(section, "Témoignages"\)/);
});

test("MSE-25.185 empty testimonial sections do not render proof social", () => {
  assert.match(renderer, /if \(!items\.length\) return null/);
  assert.match(renderer, /ratingStars \?/);
  assert.match(renderer, /Témoignages publiés/);
});
