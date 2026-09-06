"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TERRITORIES,
  buildTerritorialContentPreview,
} = require("./territorial-content-planner");

function page(slug) {
  return {
    slug,
    published: true,

    blocks: [
      {
        id: `block-${slug}`,
        type: "rich_text",
        status: "published",

        content: {
          title: "Local",
          html:
            "<p>Notre agence de Bois-Colombes accompagne les voyageurs de Colombes, Asnières-sur-Seine et La Garenne-Colombes.</p>",
        },

        seo: {
          generatedBy: "mse-25.30",
          purpose: "local-area-differentiation",
        },
      },
    ],
  };
}

function site() {
  return {
    agencyId: 6,

    slug:
      "ambassade-fram-mondescale-bois-colombes",

    agency: {
      id: 6,
      city: "Bois-Colombes",
    },

    pages: [
      page("agence"),
      page("services"),
      page("destinations"),
      page("engagements"),
    ],
  };
}

test(
  "AI-C2 creates four real service-area candidates",
  () => {
    const result =
      buildTerritorialContentPreview({
        site: site(),
        campaignId: 11,
      });

    assert.equal(result.writes, false);
    assert.equal(result.providerCalls, 0);

    assert.equal(
      result.summary.sealedCandidateCount,
      4
    );

    assert.equal(
      result.summary.manualReviewCount,
      0
    );
  }
);

test(
  "AI-C2 after-copy contains every Wave 1 territory",
  () => {
    const result =
      buildTerritorialContentPreview({
        site: site(),
        campaignId: 11,
      });

    for (const proposal of result.proposals) {
      for (const city of TERRITORIES) {
        assert.ok(
          proposal.after.html.includes(city),
          `${proposal.pageSlug} missing ${city}`
        );
      }
    }
  }
);

test(
  "AI-C2 never claims an agency in another municipality",
  () => {
    const result =
      buildTerritorialContentPreview({
        site: site(),
        campaignId: 11,
      });

    const text =
      JSON.stringify(result);

    for (const city of TERRITORIES) {
      assert.ok(
        !text.includes(`notre agence de ${city}`)
      );

      assert.ok(
        !text.includes(`notre agence à ${city}`)
      );
    }
  }
);

test(
  "AI-C2 rejects another agency",
  () => {
    assert.throws(
      () =>
        buildTerritorialContentPreview({
          site: {
            ...site(),
            agencyId: 3,
          },
          campaignId: 11,
        }),
      {
        code:
          "MSE_25_125AI_CONTENT_SCOPE_MISMATCH",
      }
    );
  }
);
