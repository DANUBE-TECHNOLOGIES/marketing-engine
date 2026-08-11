"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SEO_ACTION_LEVER,
  normalizeActionInput,
  actionMetadata,
} = require("./seo-action-history");

test("executed SEO action stores its target and execution timestamp in existing NetworkAction", () => {
  const data = normalizeActionInput({
    agencyId: 3,
    title: "Renforcer la page services",
    detail: "Enrichir la page pour la requête voyage sur mesure Gien.",
    source: "LOCAL_RANKINGS",
    code: "RANKING_NEAR_TOP10",
    keywordId: 8,
    keyword: "voyage sur mesure Gien",
    city: "Gien",
    targetPage: { pageId: "p1", slug: "services", title: "Voyages sur mesure à Gien" },
    priority: "high",
    executedAt: "2026-08-11T10:30:00Z",
  });

  assert.equal(data.agencyId, 3);
  assert.equal(data.status, "done");
  const metadata = JSON.parse(data.comment);
  assert.equal(metadata.schema, "seo-action-v1");
  assert.equal(metadata.keywordId, 8);
  assert.equal(metadata.targetPage.slug, "services");
  assert.equal(metadata.executedAt, "2026-08-11T10:30:00.000Z");
});

test("history reader restores structured SEO metadata", () => {
  const item = actionMetadata({
    id: 12,
    lever: SEO_ACTION_LEVER,
    title: "Corriger une citation",
    status: "done",
    comment: JSON.stringify({
      schema: "seo-action-v1",
      executedAt: "2026-08-10T09:00:00.000Z",
      source: "LOCAL_CITATIONS",
      code: "CITATION_INCONSISTENT",
      priority: "high",
    }),
  });

  assert.equal(item.id, 12);
  assert.equal(item.source, "LOCAL_CITATIONS");
  assert.equal(item.executedAt, "2026-08-10T09:00:00.000Z");
});

test("invalid agency or title is rejected before persistence", () => {
  assert.throws(() => normalizeActionInput({ agencyId: 0, title: "Test" }), /agence invalide/i);
  assert.throws(() => normalizeActionInput({ agencyId: 1, title: "" }), /titre.*obligatoire/i);
});
