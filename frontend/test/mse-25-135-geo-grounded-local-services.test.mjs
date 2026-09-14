import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const context = fs.readFileSync(
  path.join(root, "components/public-site/LocalContentContext.js"),
  "utf8"
);
const page = fs.readFileSync(
  path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"),
  "utf8"
);

test("MSE-25.135 local services copy reuses the canonical published-service extractor", () => {
  assert.match(context, /extractPublishedServices/);
  assert.match(context, /function publishedServiceNames\(page\)/);
  assert.match(context, /kind === "services" \? publishedServiceNames\(page\) : \[\]/);
  assert.match(page, /<LocalContentContext site=\{site\} page=\{page\}/);
});

test("MSE-25.135 services copy names only services supplied by the published page", () => {
  assert.match(context, /const published = services\.slice\(0, 4\)/);
  assert.match(context, /Les services actuellement publiés sur cette page comprennent/);
  assert.match(context, /Cette page présente les services actuellement publiés par l’agence/);
  assert.doesNotMatch(context, /Séjours, circuits, croisières, autotours ou voyages sur mesure/);
});

test("MSE-25.135 does not turn service context into expertise or transactional structured facts", () => {
  assert.doesNotMatch(context, /knowsAbout|specialist/i);
  assert.doesNotMatch(context, /itemProp="price"|itemProp="availability"/i);
});
