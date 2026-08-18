"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLocalSeoQualityUpliftPlan } = require("../src/modules/minisite-seo-enrichment/quality-uplift-planner");
const {
  projectQualityUpliftImpact,
  projectedPageImpact,
  sha256Text,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-impact-preview");

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
          { id: "hero-home", blockType: "hero", content: { title: "Agence de voyages à Gien" } },
          { id: "copy-home", blockType: "rich_text", content: { html: Array.from({ length: 130 }, () => "voyage").join(" ") } },
        ],
      },
      {
        slug: "avis",
        title: "Avis clients",
        published: true,
        blocks: [
          { id: "hero-avis", blockType: "hero", content: { title: "Avis clients à Gien" } },
          { id: "copy-avis", blockType: "rich_text", content: { html: "Avis clients à Gien." } },
        ],
      },
    ],
  };
}

test("impact preview simulates body and sealed internal-link work without mutating source", () => {
  const source = site();
  const snapshot = JSON.stringify(source);
  const currentPlan = buildLocalSeoQualityUpliftPlan(source, { minimumWords: 120 });
  const avisInternalLink = currentPlan.internalLinkOpportunities.find((item) => item.pageSlug === "avis");
  assert.ok(avisInternalLink?.path);
  const sourceHtml = source.pages[0].blocks[1].content.html;
  const finalHtml = `${sourceHtml}<p><a href="${avisInternalLink.path}">Découvrir Avis clients</a></p>`;

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
        diagnostics: { internalLink: { path: avisInternalLink.path } },
        operations: [
          { type: "enrich-body" },
          {
            type: "add-internal-link",
            target: {
              scope: "block",
              pageSlug: "home",
              blockType: "rich_text",
              blockId: "copy-home",
              field: "content.html",
            },
            sourceValueFingerprint: sha256Text(sourceHtml),
            link: { href: avisInternalLink.path, label: "Découvrir Avis clients" },
            finalValue: finalHtml,
          },
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

test("impact preview simulates exact title meta and H1 values without mutating source", () => {
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
        operations: [
          {
            type: "strengthen-title",
            target: { scope: "page", field: "seoTitle" },
            finalValue: "Avis clients sur votre agence de voyages à Gien",
          },
          {
            type: "strengthen-meta-description",
            target: { scope: "page", field: "metaDescription" },
            finalValue: "Consultez les avis clients de votre agence de voyages à Gien et préparez votre prochain projet avec une équipe de proximité.",
          },
          {
            type: "strengthen-h1",
            target: { scope: "block", blockType: "hero", blockId: "hero-avis", field: "title" },
            finalValue: "Avis clients de votre agence de voyages à Gien",
          },
        ],
      },
    ],
  });

  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(result.projectionComplete, true);
  assert.equal(result.simulation.simulatedMetadataOperations, 3);
  assert.equal(result.simulation.nonSimulatedOperations, 0);
  assert.deepEqual(result.simulation.nonSimulatedOperationTypes, []);

  const avis = result.pages.find((page) => page.pageSlug === "avis");
  assert.ok(avis);
  assert.equal(avis.projectionComplete, true);
  assert.deepEqual(avis.nonSimulatedOperationTypes, []);
});

test("impact preview refuses stale sealed internal-link source fingerprints", () => {
  const source = site();
  const currentPlan = buildLocalSeoQualityUpliftPlan(source, { minimumWords: 120 });
  const avisInternalLink = currentPlan.internalLinkOpportunities.find((item) => item.pageSlug === "avis");
  assert.ok(avisInternalLink?.path);

  const result = projectQualityUpliftImpact({
    site: source,
    currentPlan,
    proposals: [{
      pageSlug: "avis",
      operations: [{
        type: "add-internal-link",
        target: { scope: "block", pageSlug: "home", blockType: "rich_text", blockId: "copy-home", field: "content.html" },
        sourceValueFingerprint: sha256Text("ancien contenu"),
        link: { href: avisInternalLink.path, label: "Découvrir Avis clients" },
        finalValue: `<p><a href="${avisInternalLink.path}">Découvrir Avis clients</a></p>`,
      }],
    }],
  });

  assert.equal(result.projectionComplete, false);
  assert.equal(result.simulation.nonSimulatedOperations, 1);
  assert.deepEqual(result.simulation.nonSimulatedOperationTypes, ["add-internal-link"]);
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

test("per-page impact keeps multiple intent warnings distinct", () => {
  const currentPlan = {
    intentOpportunities: [
      { pageSlug: "services", intent: "cruise" },
      { pageSlug: "services", intent: "circuit" },
    ],
    thinContentOpportunities: [],
    internalLinkOpportunities: [],
  };
  const projectedPlan = {
    intentOpportunities: [
      { pageSlug: "services", intent: "circuit" },
    ],
    thinContentOpportunities: [],
    internalLinkOpportunities: [],
  };

  const pages = projectedPageImpact(currentPlan, projectedPlan, []);
  const services = pages.find((page) => page.pageSlug === "services");

  assert.ok(services);
  assert.equal(services.beforeWarnings, 2);
  assert.equal(services.projectedWarnings, 1);
  assert.equal(services.projectedReduction, 1);
  assert.deepEqual(services.resolvedWarnings, [
    { kind: "intent-quality", discriminator: "cruise" },
  ]);
});
