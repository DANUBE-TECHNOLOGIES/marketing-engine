import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");
const renderer = fs.readFileSync(path.join(root, "components/destination/DestinationPage.js"), "utf8");

test("MSE-25.30 destination structured data forms a WebPage -> TouristDestination -> TravelAgency graph", () => {
  assert.match(jsonLd, /function buildDestinationWebPageSchema/);
  assert.match(jsonLd, /"@type": "WebPage"/);
  assert.match(jsonLd, /"@type": "TouristDestination"/);
  assert.match(jsonLd, /#destination/);
  assert.match(jsonLd, /#travel-agency/);
  assert.match(jsonLd, /mainEntity:/);
  assert.match(jsonLd, /about:/);
});

test("MSE-25.30 destination renderer emits agency, webpage, destination and breadcrumb schemas", () => {
  assert.match(renderer, /buildTravelAgencySchema/);
  assert.match(renderer, /buildDestinationWebPageSchema/);
  assert.match(renderer, /buildDestinationSchema/);
  assert.match(renderer, /buildBreadcrumbSchema/);
  assert.match(renderer, /<JsonLd data=\{destinationWebPageSchema\}/);
});
