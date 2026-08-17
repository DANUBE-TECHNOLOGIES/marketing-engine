"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLocalSeoQualityUpliftPlan } = require("../src/modules/minisite-seo-enrichment/quality-uplift-planner");
const { projectQualityUpliftImpact } = require("../src/modules/minisite-seo-enrichment/quality-uplift-impact-preview");

function site() {
  return {
    slug: "mondescale-gien",
    agencyId: 1,
    agency: { id: 1, city: "Gien" },
    pages: [
      {
        slug: "home",
        title: "Agence de voyages à Gien",
        seoTitle: "Agence de voyages à Gien",
        metaDescription: "Agence de voyages à Gien pour préparer votre voyage.",
        published: true,
        blocks: [
          { blockType: "hero", content: { title: "Agence de voyages à Gien" } },
          { blockType: "rich_text", content: { html: Array.from({ length: 130 }, () => "voyage").join(" ") } },
        ],
      },
      {
        slug: "avis",
        title: "Avis clients",
        published: true,
        blocks: [
          { blockType: "hero", content: { title: "Avis clients à Gien" } },
          { blockType: "rich_text", content: { html: "Avis clients à Gien." } },
        ],
      },
    ],
  };
}

test("impact preview simulates body and internal-link work without mutating source", () => {
  const source = site();
  const snapshot = JSON.stringify(source);
  const currentPlan = buildLocalSeoQualityUpliftPlan(source, { minimumWords: 120 });
  const result = projectQualityUpliftImpact({
    site: source,
    currentPlan,
    minimumWords: 120,
    proposals: [
      {
        pageSlug: "avis",
        bodyCopyPreview: {
          title: "Informations utiles",
          html: `<p>${Array.from({ length: 130 }, () => "avis").join(" ")}</p>`,
        },
        diagnostics: { internalLink: { path: "/agence/mondescale-gien/avis" } },
        operations: [
          { type: "enrich-body" },
          { type: "add-internal-link", suggestedSourceSlugs: ["home"] },
        ],
      },
    ],
  });

  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.projectionComplete, true);
  assert.equal(result.simulation.simulatedBodyOperations, 1);
  assert.equal(result.simulation.simulatedInternalLinkOperations, 1);
  assert.deepEqual(result.simulation.nonSimulatedOperationTypes, []);
  assert.ok(result.projected.thinContent <= result.before.thinContent);
  assert.ok(result.projected.internalLink <= result.before.internalLink);

  const avis = result.pages.find((page) => page.pageSlug === "avis");
  assert.ok(avis);
  assert.ok(avis.beforeWarnings >= 2);
  assert.ok(avis.projectedWarnings < avis.beforeWarnings);
  assert.ok(avis.projectedReduction >= 1);
  assert.ok(avis.resolvedKinds.includes("thin-content"));
  assert.ok(avis.resolvedKinds.includes("internal-link"));
  assert.equal(avis.projectionComplete, true);
});

test("impact preview declares partial projection and exposes unsimulated operation types", () => {
  const source = site();
  const currentPlan = buildLocalSeoQualityUpliftPlan(source, { minimumWords: 120 });
  const result = projectQualityUpliftImpact({
    site: source,
    currentPlan,
    proposals: [{ pageSlug: "avis", operations: [{ type: "strengthen-meta-description" }] }],
  });

  assert.equal(result.projectionComplete, false);
  assert.equal(result.simulation.nonSimulatedOperations, 1);
  assert.deepEqual(result.simulation.nonSimulatedOperationTypes, ["strengthen-meta-description"]);

  const avis = result.pages.find((page) => page.pageSlug === "avis");
  assert.ok(avis);
  assert.equal(avis.projectionComplete, false);
  assert.deepEqual(avis.nonSimulatedOperationTypes, ["strengthen-meta-description"]);
});
