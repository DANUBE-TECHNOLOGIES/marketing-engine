"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TARGETS,
  homeSeo,
  servicesSeo,
  contactSeo,
  homeBodySentence,
  servicesBodySentence,
  contactBodySentence,
  localContextSentence,
  descriptiveBlock,
} = require("../scripts/mse-25-86-seo-coverage-remediation");
const {
  rollbackSnapshots,
} = require("../scripts/mse-25-86-seo-coverage-rollback");
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
      { blockType: "hero", content: { h1: seo.h1, subtitle: "Hero conservé" } },
      { blockType: "text", content: { text: body } },
    ],
  };
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

test("home remediation makes advice, custom, package and cruise locally strong without depth padding", () => {
  for (const city of TARGETS.map((item) => item.city)) {
    const page = pageFromSeo("home", homeSeo(city), homeBodySentence(city));
    for (const key of ["advice", "custom", "package", "cruise"]) {
      const intent = INTENTS.find((item) => item.key === key);
      const result = qualityForTarget(page, city, intent);
      assert.equal(result.status, "strong", `${city} / ${key}: ${result.score}`);
      assert.ok(result.score >= 80, `${city} / ${key}: ${result.score}`);
    }
  }
});

test("services remediation makes ticketing locally strong without depth padding", () => {
  for (const city of TARGETS.map((item) => item.city)) {
    const page = pageFromSeo("services", servicesSeo(city), servicesBodySentence(city));
    const intent = INTENTS.find((item) => item.key === "ticketing");
    const result = qualityForTarget(page, city, intent);
    assert.equal(result.status, "strong", `${city}: ${result.score}`);
  }
});

test("contact remediation makes appointment intent locally strong where report requires it", () => {
  for (const target of TARGETS.filter((item) => item.appointment)) {
    const page = pageFromSeo("contact", contactSeo(target.city), contactBodySentence(target.city));
    const intent = INTENTS.find((item) => item.key === "appointment");
    const result = qualityForTarget(page, target.city, intent);
    assert.equal(result.status, "strong", `${target.city}: ${result.score}`);
  }
});

test("Melun and Amilly local-context addition closes territorial anchoring dimension", () => {
  for (const city of ["Melun", "Amilly"]) {
    const home = pageFromSeo(
      "accueil",
      homeSeo(city),
      `${homeBodySentence(city)} ${localContextSentence(city)}`
    );
    const depth = auditLocalSemanticDepth({ agency: { city }, pages: [home] });
    assert.equal(depth.dimensions.localContext, true);
  }
});

test("body enrichment never selects hero text", () => {
  const page = {
    blocks: [
      { blockType: "hero", content: { h1: "Titre", subtitle: "Sous-titre hero" } },
      { blockType: "text", content: { text: "Texte éditorial existant" } },
    ],
  };
  const block = descriptiveBlock(page);
  assert.ok(block);
  assert.equal(block.blockType, "text");
});

test("body enrichment refuses hero-only pages instead of changing presentation", () => {
  const page = {
    blocks: [
      { blockType: "hero", content: { h1: "Titre", subtitle: "Sous-titre hero" } },
    ],
  };
  assert.equal(descriptiveBlock(page), null);
});

test("rollback restores snapshots in reverse order", async () => {
  const calls = [];
  const tx = {
    pageBlock: {
      update: async (payload) => calls.push({ model: "block", payload }),
    },
    agencySitePage: {
      update: async (payload) => calls.push({ model: "page", payload }),
    },
  };

  const snapshots = [
    { type: "page", id: "page-1", slug: "home", seoTitle: "old title", metaDescription: "old meta" },
    { type: "block", id: "block-1", pageId: "page-1", content: { text: "original" } },
    { type: "block", id: "block-1", pageId: "page-1", content: { text: "after first change" } },
  ];

  const restored = await rollbackSnapshots(tx, snapshots, { dryRun: false });
  assert.equal(restored.length, 3);
  assert.equal(calls[0].model, "block");
  assert.deepEqual(calls[0].payload.data.content, { text: "after first change" });
  assert.deepEqual(calls[1].payload.data.content, { text: "original" });
  assert.equal(calls[2].model, "page");
  assert.equal(calls[2].payload.data.seoTitle, "old title");
});
