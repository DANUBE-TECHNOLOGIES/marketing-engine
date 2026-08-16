"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  persistenceValidationIssue,
  persistenceValidationIssues,
} = require("../src/modules/minisite-seo-enrichment/persistence-preflight");
const { preRolloutQualityReport } = require("../src/modules/minisite-seo-enrichment/pre-rollout-quality");

function pageWithPositions(positions) {
  return {
    slug: "budapest-faq",
    title: "FAQ Budapest",
    published: true,
    page: {
      title: "FAQ Budapest",
      slug: "budapest-faq",
      status: "published",
      published: true,
      seoTitle: "FAQ Budapest | Mondescale Voyages",
      metaDescription: "Préparez votre séjour à Budapest avec votre agence Mondescale.",
    },
    optimizedBlocks: positions.map((position, index) => ({
      type: index === 0 ? "hero" : "rich_text",
      status: "published",
      position,
      settings: {},
      content: index === 0
        ? { title: "FAQ Budapest", subtitle: "Conseils pour préparer votre séjour." }
        : { title: `Conseil ${index}`, html: `<p>Contenu utile ${index}.</p>`, alignment: "left" },
    })),
  };
}

test("MSE-25.30 preflight reports duplicate V2 positions before rollout", () => {
  const plan = { agencyId: 5, siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere", pages: [pageWithPositions([0, 0])] };
  const issue = persistenceValidationIssue(plan, plan.pages[0]);
  assert.equal(issue.code, "PAGE_BUILDER_V2_PAYLOAD_INVALID");
  assert.equal(issue.severity, "blocking");
  assert.equal(issue.persistenceCode, "DUPLICATE_BLOCK_POSITION");
  assert.equal(issue.slug, "budapest-faq");

  const quality = preRolloutQualityReport([plan], { minimumWords: 0 });
  assert.equal(quality.persistenceBlockingCount, 1);
  assert.equal(quality.blocked, true);
  assert.ok(quality.blocking.some((item) => item.persistenceCode === "DUPLICATE_BLOCK_POSITION"));
});

test("MSE-25.30 persistence preflight accepts unique V2 positions", () => {
  const plan = { agencyId: 5, siteSlug: "ambassade-fram-mondescale-ozoir-la-ferriere", pages: [pageWithPositions([10, 20])] };
  assert.equal(persistenceValidationIssue(plan, plan.pages[0]), null);
  assert.deepEqual(persistenceValidationIssues([plan]), []);
});
