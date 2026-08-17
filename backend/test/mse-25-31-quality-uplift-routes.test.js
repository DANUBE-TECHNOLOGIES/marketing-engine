"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const routesPath = path.join(__dirname, "../src/modules/minisite-seo-enrichment/routes.js");

function source() {
  return fs.readFileSync(routesPath, "utf8");
}

test("quality uplift exposes agency and network preview routes", () => {
  const text = source();
  assert.match(text, /agencies\/:agencyId\/quality-uplift\/preview/);
  assert.match(text, /network\/quality-uplift\/preview/);
  assert.match(text, /previewAgencyQualityUplift/);
  assert.match(text, /previewNetworkQualityUplift/);
});

test("quality uplift remains preview-only with no apply or mutation route", () => {
  const text = source();
  assert.doesNotMatch(text, /quality-uplift\/apply/);
  assert.doesNotMatch(text, /router\.post\("\/minisite-seo-enrichment\/network\/quality-uplift"/);
  assert.doesNotMatch(text, /applyQualityUplift/);
  assert.doesNotMatch(text, /optimizeQualityUplift/);
});
