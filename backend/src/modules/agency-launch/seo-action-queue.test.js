"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSeoActionQueue,
  applySeoActionQueue,
} = require("./seo-action-queue");

test("ranking opportunity mapped to a page becomes a concrete high priority action", () => {
  const queue = buildSeoActionQueue({
    checks: [{
      code: "LOCAL_RANKINGS",
      opportunities: [{
        priority: "high",
        type: "near_top10",
        keyword: "voyage sur mesure Gien",
        city: "Gien",
        action: "Renforcer la page existante.",
        targetPage: { pageId: "services", slug: "services", title: "Voyages sur mesure à Gien" },
      }],
    }],
  });

  assert.equal(queue.total, 1);
  assert.equal(queue.actions[0].priority, "high");
  assert.equal(queue.actions[0].target.slug, "services");
});

test("citation inconsistencies outrank medium local content recommendations", () => {
  const queue = buildSeoActionQueue({
    checks: [
      {
        code: "LOCAL_CITATIONS",
        inconsistencies: [{
          listingId: 1,
          directory: "PagesJaunes",
          fields: ["adresse", "téléphone"],
        }],
      },
      {
        code: "LOCAL_CONTENT",
        passed: false,
        recommendation: "Enrichir les pages locales.",
      },
    ],
  });

  assert.equal(queue.actions[0].source, "LOCAL_CITATIONS");
  assert.equal(queue.actions[1].source, "LOCAL_CONTENT");
});

test("healthy checks do not create noise in the action queue", () => {
  const queue = buildSeoActionQueue({
    checks: [
      { code: "LOCAL_TRUST", passed: true },
      { code: "LOCAL_SEO", passed: true },
      { code: "LOCAL_CONTENT", passed: true },
      { code: "CONTENT_SIMILARITY", passed: true },
      { code: "LOCAL_RANKINGS", opportunities: [] },
      { code: "LOCAL_CITATIONS", inconsistencies: [] },
    ],
  });

  assert.equal(queue.total, 0);
  assert.deepEqual(queue.actions, []);
});

test("action queue does not alter publication score or readiness", () => {
  const report = {
    version: "2.4",
    readiness: { score: 90, ready: true, blockers: [] },
    checks: [{
      code: "LOCAL_CONTENT",
      passed: false,
      recommendation: "Enrichir le contenu local.",
    }],
  };

  const next = applySeoActionQueue(report);
  assert.equal(next.version, "2.5");
  assert.equal(next.readiness.score, 90);
  assert.equal(next.readiness.ready, true);
  assert.equal(next.seoActions.total, 1);
});
