"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_EXCLUDED_SITE_SLUGS,
  configuredExcludedSiteSlugs,
  differentiationContent,
  hardenQualityReport,
  installEditorialHardening,
  naturalizeFrench,
} = require("../src/modules/minisite-seo-enrichment/editorial-hardening-patch");

function textBlock(text) {
  return { type: "rich_text", content: { text } };
}

test("MSE-25.30 naturalise les formulations locales françaises sans keyword stuffing", () => {
  assert.equal(
    naturalizeFrench("Notre agence de Amilly vous accompagne.", "Amilly"),
    "Notre agence d’Amilly vous accompagne."
  );
  assert.equal(
    naturalizeFrench("TUI STORE Amilly à Amilly vous conseille.", "Amilly"),
    "TUI STORE Amilly vous conseille."
  );
  assert.equal(
    naturalizeFrench("Ambassade FRAM - Mondescale Ozoir la Ferrière à Ozoir la Ferrière vous accueille.", "Ozoir la Ferrière"),
    "Ambassade FRAM - Mondescale Ozoir la Ferrière vous accueille."
  );
});

test("MSE-25.30 promeut une page publiée sans contenu visible en blocage", () => {
  const hardened = hardenQualityReport({
    blocking: [],
    warnings: [
      { code: "THIN_CONTENT", severity: "warning", wordCount: 0, siteSlug: "ozoir", slug: "budapest-weekend" },
      { code: "THIN_CONTENT", severity: "warning", wordCount: 63, siteSlug: "gien", slug: "equipe" },
    ],
    blockingCount: 0,
    warningCount: 2,
    blocked: false,
  });

  assert.equal(hardened.blocked, true);
  assert.equal(hardened.blockingCount, 1);
  assert.equal(hardened.blocking[0].code, "EMPTY_INDEXABLE_CONTENT");
  assert.equal(hardened.blocking[0].slug, "budapest-weekend");
  assert.equal(hardened.warningCount, 1);
  assert.equal(hardened.warnings[0].slug, "equipe");
});

test("MSE-25.30 exclut Melun par défaut mais permet une surcharge opérateur", () => {
  const variable = "MSE_25_30_EXCLUDED_SITE_SLUGS";
  const previous = process.env[variable];
  delete process.env[variable];
  try {
    assert.deepEqual(configuredExcludedSiteSlugs(), [...DEFAULT_EXCLUDED_SITE_SLUGS]);
    assert.deepEqual(configuredExcludedSiteSlugs("tui-store-melun, MONDESCALE-TEST, tui-store-melun"), ["tui-store-melun", "mondescale-test"]);
    assert.deepEqual(configuredExcludedSiteSlugs([]), []);
  } finally {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
  }
});

test("MSE-25.30 produit une différenciation locale déterministe sans inventer de communes", () => {
  const services = differentiationContent({
    siteSlug: "tui-store-amilly",
    city: "Amilly",
    page: { slug: "services", title: "Nos services" },
  });
  const engagements = differentiationContent({
    siteSlug: "tui-store-amilly",
    city: "Amilly",
    page: { slug: "engagements", title: "Nos engagements" },
  });

  assert.ok(services);
  assert.ok(engagements);
  assert.match(services.html, /Amilly/);
  assert.match(engagements.html, /Amilly/);
  assert.doesNotMatch(`${services.html} ${engagements.html}`, /Montargis|Gien|Melun|Orléans/);
  assert.deepEqual(
    services,
    differentiationContent({ siteSlug: "tui-store-amilly", city: "Amilly", page: { slug: "services", title: "Nos services" } })
  );
});

test("MSE-25.30 retire une agence exclue avant les gates réseau et expose le périmètre", async () => {
  class FakeService {
    health() { return { status: "ok" }; }

    async buildAgencyContentOptimization() {
      return { plans: [] };
    }

    async buildNetworkContentOptimization() {
      return {
        version: "mse-25.30",
        plans: [
          {
            agencyId: 8,
            siteSlug: "tui-store-melun",
            city: "Melun",
            summary: { pagesProcessed: 1, pagesChanged: 1 },
            pages: [{ slug: "home", published: true, changed: true, optimizedBlocks: [textBlock("contenu melun suffisamment distinct pour le test")], changes: [] }],
          },
          {
            agencyId: 9,
            siteSlug: "tui-store-amilly",
            city: "Amilly",
            summary: { pagesProcessed: 1, pagesChanged: 1 },
            pages: [{ slug: "home", published: true, changed: true, optimizedBlocks: [textBlock("contenu amilly suffisamment distinct pour le test")], changes: [] }],
          },
        ],
        similarity: {},
        quality: {},
        sitemapReadiness: { blocked: false, notReadyCount: 0 },
        summary: {},
      };
    }
  }

  installEditorialHardening(FakeService);
  const result = await new FakeService().buildNetworkContentOptimization({ excludedSiteSlugs: ["tui-store-melun"] });

  assert.deepEqual(result.plans.map((plan) => plan.siteSlug), ["tui-store-amilly"]);
  assert.deepEqual(result.excludedAgencies, [{ agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" }]);
  assert.equal(result.summary.agenciesProcessed, 1);
  assert.equal(result.summary.agenciesExcluded, 1);
  assert.equal(new FakeService().health().networkAgencyExclusionGuard, true);
});
