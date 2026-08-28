"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TARGETS,
  homeSeo,
  servicesSeo,
  contactSeo,
  localContextSentence,
} = require("../scripts/mse-25-86-seo-coverage-remediation");
const {
  INTENTS,
} = require("../src/modules/minisite-structured-data/local-search-intent-coverage");
const {
  qualityForTarget,
} = require("../src/modules/minisite-structured-data/local-intent-target-quality");
const {
  auditLocalSemanticDepth,
} = require("../src/modules/minisite-structured-data/local-semantic-depth");

function pageFromSeo(slug, seo, body) {
  return {
    slug,
    published: true,
    status: "published",
    seoTitle: seo.seoTitle,
    metaDescription: seo.metaDescription,
    blocks: [
      { blockType: "hero", content: { h1: seo.h1, subtitle: body } },
    ],
  };
}

function longBody(city, extra = "") {
  const sentence = `À ${city}, notre agence de voyages propose conseil voyage, accompagnement, voyage sur mesure, séjours, circuits, croisières, billetterie et vols, avec contact et rendez vous en agence physique. `;
  return `${sentence.repeat(9)} ${extra}`.trim();
}

test("MSE-25.86 targets exactly the nine sites from the coverage report", () => {
  assert.deepEqual(
    TARGETS.map((item) => item.city),
    [
      "Ozoir la Ferrière",
      "Maurepas",
      "Nevers",
      "Dax",
      "Gien",
      "Bois-Colombes",
      "Lamorlaye",
      "Melun",
      "Amilly",
    ]
  );
});

test("home remediation makes advice, custom, package and cruise locally strong", () => {
  for (const city of TARGETS.map((item) => item.city)) {
    const seo = homeSeo(city);
    const page = pageFromSeo("home", seo, longBody(city));
    for (const key of ["advice", "custom", "package", "cruise"]) {
      const intent = INTENTS.find((item) => item.key === key);
      const result = qualityForTarget(page, city, intent);
      assert.equal(result.status, "strong", `${city} / ${key}: ${result.score}`);
      assert.ok(result.score >= 80, `${city} / ${key}: ${result.score}`);
    }
  }
});

test("services remediation makes ticketing locally strong", () => {
  for (const city of TARGETS.map((item) => item.city)) {
    const seo = servicesSeo(city);
    const page = pageFromSeo("services", seo, longBody(city));
    const intent = INTENTS.find((item) => item.key === "ticketing");
    const result = qualityForTarget(page, city, intent);
    assert.equal(result.status, "strong", `${city}: ${result.score}`);
  }
});

test("contact remediation makes appointment intent locally strong", () => {
  for (const city of TARGETS.map((item) => item.city)) {
    const seo = contactSeo(city);
    const page = pageFromSeo("contact", seo, longBody(city));
    const intent = INTENTS.find((item) => item.key === "appointment");
    const result = qualityForTarget(page, city, intent);
    assert.equal(result.status, "strong", `${city}: ${result.score}`);
  }
});

test("Melun and Amilly local-context addition closes territorial anchoring dimension", () => {
  for (const city of ["Melun", "Amilly"]) {
    const home = pageFromSeo(
      "accueil",
      homeSeo(city),
      longBody(city, localContextSentence(city))
    );
    const site = {
      agency: { city },
      pages: [home],
    };
    const depth = auditLocalSemanticDepth(site);
    assert.equal(depth.dimensions.localContext, true);
  }
});
