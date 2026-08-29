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
  buildTargetPlan,
  projectionForPlan,
  summarizePlans,
} = require("../scripts/mse-25-86-seo-coverage-remediation");
const {
  verifyPersistedPlan,
} = require("../scripts/mse-25-86-post-apply-verify");
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
    id: `page-${slug}`,
    slug,
    published: true,
    status: "published",
    seoTitle: seo.seoTitle,
    metaDescription: seo.metaDescription,
    blocks: [
      { id: `hero-${slug}`, blockType: "hero", content: { h1: seo.h1, subtitle: "Hero conservé" } },
      { id: `text-${slug}`, blockType: "text", content: { text: body } },
    ],
  };
}

function weakPage(slug, city, title) {
  return {
    id: `page-${slug}`,
    slug,
    published: true,
    status: "published",
    seoTitle: `${title} ${city}`,
    metaDescription: `Découvrez notre agence à ${city}.`,
    blocks: [
      { id: `hero-${slug}`, blockType: "hero", content: { h1: `${title} ${city}`, subtitle: "Hero conservé" } },
      { id: `text-${slug}`, blockType: "text", content: { text: `Notre équipe vous accueille à ${city} pour préparer votre projet.` } },
    ],
  };
}

function fullyRemediatedSite(target) {
  const city = target.city;
  const pages = [
    pageFromSeo(target.city === "Melun" || target.city === "Amilly" ? "accueil" : "home", homeSeo(city), `${homeBodySentence(city)}${target.localContext ? ` ${localContextSentence(city)}` : ""}`),
    pageFromSeo("services", servicesSeo(city), servicesBodySentence(city)),
  ];
  if (target.appointment) pages.push(pageFromSeo("contact", contactSeo(city), contactBodySentence(city)));
  return { id: `site-${city}`, slug: city.toLowerCase().replace(/[^a-z0-9]+/g, "-"), agency: { city }, pages };
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
    const home = pageFromSeo("accueil", homeSeo(city), `${homeBodySentence(city)} ${localContextSentence(city)}`);
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
  const page = { blocks: [{ blockType: "hero", content: { h1: "Titre", subtitle: "Sous-titre hero" } }] };
  assert.equal(descriptiveBlock(page), null);
});

test("network preflight rejects an incomplete site before any apply phase", () => {
  const target = TARGETS.find((item) => item.city === "Dax");
  const site = {
    id: "site-dax",
    slug: "dax",
    agency: { city: "Dax" },
    pages: [
      pageFromSeo("home", homeSeo("Dax"), homeBodySentence("Dax")),
      {
        ...pageFromSeo("services", servicesSeo("Dax"), servicesBodySentence("Dax")),
        blocks: [{ id: "hero-services", blockType: "hero", content: { h1: servicesSeo("Dax").h1, subtitle: "Hero uniquement" } }],
      },
      pageFromSeo("contact", contactSeo("Dax"), contactBodySentence("Dax")),
    ],
  };
  assert.throws(() => buildTargetPlan([site], target), (error) => error?.code === "MSE_25_86_EXISTING_NON_HERO_TEXT_REQUIRED");
});

test("projected coverage reports before/after and requires all target intents strong", () => {
  const target = TARGETS.find((item) => item.city === "Dax");
  const site = {
    id: "site-dax",
    slug: "dax",
    agency: { city: "Dax" },
    pages: [
      weakPage("home", "Dax", "Votre agence"),
      weakPage("services", "Dax", "Nos services"),
      weakPage("contact", "Dax", "Nous contacter"),
    ],
  };
  const projection = projectionForPlan(buildTargetPlan([site], target));
  assert.equal(projection.city, "Dax");
  assert.equal(projection.allRequiredStrong, true);
  for (const key of projection.requiredIntents) {
    assert.equal(projection.after[key].status, "strong", key);
    assert.ok(projection.after[key].score >= 80, key);
  }
  assert.ok(projection.before.advice.score < projection.after.advice.score);
  assert.ok(projection.before.ticketing.score < projection.after.ticketing.score);
  assert.ok(projection.before.appointment.score < projection.after.appointment.score);
});

test("territorial projection explicitly closes local-context gap for Melun", () => {
  const target = TARGETS.find((item) => item.city === "Melun");
  const site = {
    id: "site-melun",
    slug: "melun",
    agency: { city: "Melun" },
    pages: [
      weakPage("accueil", "Melun", "Votre agence"),
      weakPage("services", "Melun", "Nos services"),
    ],
  };
  const projection = projectionForPlan(buildTargetPlan([site], target));
  assert.equal(projection.localContextBefore, false);
  assert.equal(projection.localContextAfter, true);
  assert.equal(projection.allRequiredStrong, true);
  assert.equal(projection.after.appointment, null);
});

test("site summaries remain agency-scoped for preview review", () => {
  const target = TARGETS.find((item) => item.city === "Melun");
  const site = {
    id: "site-melun",
    slug: "melun",
    agency: { city: "Melun" },
    pages: [
      pageFromSeo("accueil", homeSeo("Melun"), homeBodySentence("Melun")),
      pageFromSeo("services", servicesSeo("Melun"), servicesBodySentence("Melun")),
    ],
  };
  const plan = buildTargetPlan([site], target);
  const projection = projectionForPlan(plan);
  const summary = summarizePlans([plan], [{ city: "Melun", role: "home" }, { city: "Melun", role: "services" }], [projection]);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].city, "Melun");
  assert.equal(summary[0].plannedChanges, 2);
  assert.equal(summary[0].appointmentRemediation, false);
  assert.equal(summary[0].territorialAnchor, true);
  assert.equal(summary[0].projection.allRequiredStrong, true);
});

test("post-apply verification certifies persisted scores equal to projected scores", () => {
  const target = TARGETS.find((item) => item.city === "Dax");
  const site = fullyRemediatedSite(target);
  const plan = buildTargetPlan([site], target);
  const expectedProjection = projectionForPlan(plan);
  const verification = verifyPersistedPlan(plan, expectedProjection);
  assert.equal(verification.verified, true);
  assert.equal(verification.intentsVerified, true);
  assert.equal(verification.localContextVerified, true);
  for (const check of verification.intentChecks) {
    assert.equal(check.statusStrong, true, check.intent);
    assert.equal(check.scoreMatchesProjection, true, check.intent);
  }
});

test("post-apply verification detects persisted drift from projected scores", () => {
  const target = TARGETS.find((item) => item.city === "Dax");
  const expectedSite = fullyRemediatedSite(target);
  const expectedPlan = buildTargetPlan([expectedSite], target);
  const expectedProjection = projectionForPlan(expectedPlan);

  const driftedSite = fullyRemediatedSite(target);
  driftedSite.pages.find((page) => page.slug === "services").seoTitle = "Nos services à Dax";
  const driftedPlan = buildTargetPlan([driftedSite], target);
  const verification = verifyPersistedPlan(driftedPlan, expectedProjection);
  assert.equal(verification.verified, false);
  assert.equal(verification.intentsVerified, false);
  assert.equal(verification.intentChecks.find((item) => item.intent === "ticketing").scoreMatchesProjection, false);
});

test("rollback restores snapshots in reverse order", async () => {
  const calls = [];
  const tx = {
    pageBlock: { update: async (payload) => calls.push({ model: "block", payload }) },
    agencySitePage: { update: async (payload) => calls.push({ model: "page", payload }) },
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