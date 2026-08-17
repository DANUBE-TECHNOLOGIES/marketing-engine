"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLocalSeoQualityUpliftPlan,
  missingSignals,
  thinContentOpportunities,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-planner");

test("missingSignals reports only the SEO dimensions that still need uplift", () => {
  assert.deepEqual(
    missingSignals({
      titleQualified: true,
      metaQualified: false,
      h1Qualified: true,
      bodyQualified: false,
      sufficientDepth: false,
    }),
    ["meta", "body", "depth"]
  );
});

test("thinContentOpportunities only includes published pages below the threshold", () => {
  const site = {
    pages: [
      {
        slug: "avis",
        published: true,
        blocks: [{ content: { text: "Un contenu court pour les avis clients." } }],
      },
      {
        slug: "home",
        published: true,
        blocks: [{ content: { text: Array.from({ length: 130 }, () => "voyage").join(" ") } }],
      },
      {
        slug: "draft",
        published: false,
        status: "draft",
        blocks: [{ content: { text: "court" } }],
      },
    ],
  };

  const opportunities = thinContentOpportunities(site, { minimumWords: 120 });
  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].pageSlug, "avis");
  assert.equal(opportunities[0].minimumWords, 120);
  assert.ok(opportunities[0].missingWords > 0);
});

test("quality uplift plan is read-only and does not turn secondary weakness into a blocking gate", () => {
  const richBody = Array.from({ length: 130 }, () => "voyage").join(" ");
  const site = {
    slug: "mondescale-test",
    agencyId: 42,
    agency: { id: 42, city: "Gien" },
    pages: [
      {
        slug: "home",
        title: "Agence de voyages Gien",
        seoTitle: "Agence de voyages à Gien",
        metaDescription: "Votre agence de voyages à Gien pour des conseils, séjours, circuits, croisières et voyages sur mesure.",
        published: true,
        blocks: [
          { blockType: "hero", content: { title: "Agence de voyages à Gien" } },
          { blockType: "rich_text", content: { html: `Conseil voyage sur mesure séjours circuits croisières à Gien ${richBody}` } },
        ],
      },
      {
        slug: "services",
        title: "Services",
        seoTitle: "Services de voyage à Gien",
        metaDescription: "Billetterie et vols avec votre agence à Gien.",
        published: true,
        blocks: [
          { blockType: "hero", content: { title: "Services de voyage à Gien" } },
          { blockType: "rich_text", content: { html: `Billetterie vols à Gien ${richBody}` } },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        seoTitle: "Contact agence de voyages Gien",
        metaDescription: "Contactez votre agence à Gien pour un rendez-vous.",
        published: true,
        blocks: [
          { blockType: "hero", content: { title: "Contact et rendez-vous à Gien" } },
          { blockType: "rich_text", content: { html: `Rendez-vous conseil à Gien ${richBody}` } },
        ],
      },
    ],
  };

  const plan = buildLocalSeoQualityUpliftPlan(site);
  assert.equal(plan.version, "mse-25.31");
  assert.equal(plan.readOnly, true);
  assert.equal(plan.siteSlug, "mondescale-test");
  assert.ok(Array.isArray(plan.intentOpportunities));
  assert.ok(Array.isArray(plan.thinContentOpportunities));
  assert.equal(plan.summary.totalOpportunityCount, plan.summary.intentOpportunityCount + plan.summary.thinContentOpportunityCount);
  assert.equal(plan.intentOpportunities.some((item) => item.severity === "blocking"), false);
});
