"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGeneralSeo } = require("../src/modules/content-engine/default-content/seo-builder");

test("default service SEO stays local without inventing specialties", () => {
  const seo = buildGeneralSeo("SERVICES", {
    agency: {
      name: "Mondescale Test",
      city: "Gien",
    },
  });

  assert.match(seo.title, /Services de voyage à Gien/);
  assert.match(seo.h1, /Nos services de voyage à Gien/);
  assert.doesNotMatch(seo.description, /croisières/i);
  assert.doesNotMatch(seo.description, /circuits/i);
  assert.doesNotMatch(seo.description, /sur mesure/i);
});
