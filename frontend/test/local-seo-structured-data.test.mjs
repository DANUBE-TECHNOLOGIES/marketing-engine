import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const localAreas = await readFile(
  new URL("../lib/seo/local-area-config.js", import.meta.url),
  "utf8"
);
const jsonLd = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);
const audit = await readFile(
  new URL("../scripts/audit-public-seo.mjs", import.meta.url),
  "utf8"
);

test("priority competitive towns are part of local catchment fallbacks", () => {
  assert.match(localAreas, /"ambassade-fram-mondescale-ozoir-la-ferriere"[\s\S]*"Pontault-Combault"/);
  assert.match(localAreas, /"mondescale-lamorlaye"[\s\S]*"Chantilly"/);
});

test("WebPage structured data resolves a primary image from the page or agency", () => {
  assert.match(jsonLd, /function schemaImage\(page, site\)/);
  assert.match(jsonLd, /primaryImageOfPage/);
  assert.match(jsonLd, /pageImage = image \? absoluteUrl\(image\) : schemaImage\(page, site\)/);
});

test("TravelAgency structured data keeps local entity signals", () => {
  assert.match(jsonLd, /\["TravelAgency", "LocalBusiness"\]/);
  assert.match(jsonLd, /areaServed: servedAreas/);
  assert.match(jsonLd, /openingHoursSpecification/);
  assert.match(jsonLd, /sameAs/);
});

test("public SEO audit checks structured data and social previews", () => {
  assert.match(audit, /hasTravelAgency/);
  assert.match(audit, /hasBreadcrumb/);
  assert.match(audit, /hasPrimaryImage/);
  assert.match(audit, /og:image/);
  assert.match(audit, /Title dupliqué/);
  assert.match(audit, /Description dupliquée/);
});
