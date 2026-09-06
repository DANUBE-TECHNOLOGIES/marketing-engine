"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOIS_COLOMBES,
  buildTerritorialLinkPreview,
} = require("./territorial-link-planner");

const {
  buildTerritorialLinkWriteIntent,
} = require("./territorial-link-write-intent");

function block(id) {
  return {
    id,
    type: "rich_text",
    status: "published",
    position: 1,
    content: {
      html:
        "<p>Notre équipe vous accompagne dans la préparation de votre voyage et vous conseille selon votre projet.</p>",
    },
    settings: {},
    seo: {},
    visibleDesktop: true,
    visibleMobile: true,
  };
}

function page(slug) {
  return {
    id: `page-${slug}`,
    slug,
    title: slug,
    status: "published",
    published: true,
    seoTitle: "",
    metaDescription: "",
    blocks: [block(`block-${slug}`)],
  };
}

function site() {
  return {
    slug: BOIS_COLOMBES.siteSlug,
    agencyId: 6,
    agency: {
      id: 6,
      name: "Mondescale Bois-Colombes",
      city: "Bois-Colombes",
    },
    pages: [
      page("services"),
      page("agence"),
      page("destinations"),
      page("engagements"),
    ],
  };
}

test("AI-C builds four sealed persistence intents with zero writes", () => {
  const current = site();

  const preview = buildTerritorialLinkPreview({
    site: current,
    campaignId: 11,
  });

  const intent = buildTerritorialLinkWriteIntent({
    preview,
    currentPages: current.pages,
  });

  assert.equal(intent.readOnly, true);
  assert.equal(intent.writes, false);
  assert.equal(intent.publicWrites, false);
  assert.equal(intent.persistenceCallsPerformed, 0);

  assert.equal(intent.summary.touchedPageCount, 4);
  assert.equal(intent.intents.length, 4);

  for (const row of intent.intents) {
    assert.equal(
      row.persistence.method,
      "PageBuilderPersistenceService.save"
    );

    assert.ok(row.sourceValueFingerprint);
    assert.ok(row.sourcePageSnapshotFingerprint);
    assert.ok(row.targetPageSnapshotFingerprint);

    assert.notEqual(
      row.exactChange.beforeHtml,
      row.exactChange.afterHtml
    );

    assert.match(
      row.exactChange.afterHtml,
      /data-seo-link="mse-25\.125ai-v1"/
    );
  }
});

test("AI-C rejects stale source content", () => {
  const current = site();

  const preview = buildTerritorialLinkPreview({
    site: current,
    campaignId: 11,
  });

  current.pages[0].blocks[0].content.html +=
    "<p>changed-after-preview</p>";

  assert.throws(
    () =>
      buildTerritorialLinkWriteIntent({
        preview,
        currentPages: current.pages,
      }),
    {
      code: "MSE_25_125AI_SOURCE_FINGERPRINT_MISMATCH",
    }
  );
});
