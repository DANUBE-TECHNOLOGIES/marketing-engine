"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOIS_COLOMBES,
  buildTerritorialLinkPreview,
} = require("./territorial-link-planner");

function page(slug, id) {
  return {
    slug,
    published: true,
    blocks: [
      {
        id,
        type: "rich_text",
        content: {
          html: "<p>Notre équipe vous accompagne dans la préparation de votre voyage et vous conseille selon votre projet.</p>",
        },
      },
    ],
  };
}

function site() {
  return {
    slug: BOIS_COLOMBES.siteSlug,
    agencyId: 6,
    agency: {
      id: 6,
      city: "Bois-Colombes",
    },
    pages: [
      page("services", "services-rich"),
      page("agence", "agence-rich"),
      page("destinations", "destinations-rich"),
      page("engagements", "engagements-rich"),
    ],
  };
}

test("AI-B produces exactly four territorial candidates", () => {
  const preview = buildTerritorialLinkPreview({
    site: site(),
    campaignId: 11,
  });

  assert.equal(preview.writes, false);
  assert.equal(preview.destructive, false);
  assert.equal(preview.providerCalls, 0);
  assert.equal(preview.summary.territoryCount, 4);
  assert.equal(preview.summary.sealedCandidateCount, 4);
  assert.equal(preview.summary.manualReviewCount, 0);
});

test("AI-B covers the four Wave 1 territories", () => {
  const preview = buildTerritorialLinkPreview({
    site: site(),
    campaignId: 11,
  });

  assert.deepEqual(
    preview.proposals.map((row) => row.city),
    [
      "Levallois-Perret",
      "Asnières-sur-Seine",
      "Clichy",
      "Neuilly-sur-Seine",
    ]
  );
});

test("AI-B targets only the canonical Bois-Colombes agency", () => {
  const preview = buildTerritorialLinkPreview({
    site: site(),
    campaignId: 11,
  });

  for (const row of preview.proposals) {
    assert.equal(
      row.targetHref,
      "/agence/ambassade-fram-mondescale-bois-colombes"
    );

    assert.ok(row.sourceValueFingerprint);
    assert.match(row.finalValue, /data-seo-link="mse-25\.125ai-v1"/);
    assert.match(row.finalValue, new RegExp(row.city));
  }
});

test("AI-B uses four distinct editorial source pages", () => {
  const preview = buildTerritorialLinkPreview({
    site: site(),
    campaignId: 11,
  });

  assert.equal(
    new Set(preview.proposals.map((row) => row.sourcePageSlug)).size,
    4
  );
});

test("AI-B is idempotent when territorial link already exists", () => {
  const current = site();

  current.pages[0].blocks[0].content.html +=
    '<p>Levallois-Perret <a href="/agence/ambassade-fram-mondescale-bois-colombes">agence</a></p>';

  const preview = buildTerritorialLinkPreview({
    site: current,
    campaignId: 11,
  });

  const row = preview.proposals.find(
    (item) => item.city === "Levallois-Perret"
  );

  assert.equal(row.status, "already-present");
});

test("AI-B rejects another agency or campaign", () => {
  assert.throws(
    () =>
      buildTerritorialLinkPreview({
        site: {
          ...site(),
          agencyId: 3,
        },
        campaignId: 11,
      }),
    { code: "MSE_25_125AI_SCOPE_MISMATCH" }
  );
});
