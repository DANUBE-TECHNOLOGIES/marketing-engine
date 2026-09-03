"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { saveBody } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");
const { digest, buildPostRolloutValidation } = require("../src/modules/minisite-semantic-engine/internal-link-post-rollout-validation");

function page() {
  return {
    title: "Services",
    slug: "services",
    status: "published",
    blocks: [{
      type: "rich_text",
      status: "published",
      position: 0,
      content: {
        title: "Nos services",
        html: '<p>Notre équipe vous accompagne.</p><p data-seo-link="mse-25.47"><a href="/engagements">Découvrir nos engagements</a> — Découvrez également nos engagements.</p>',
      },
      settings: {},
      seo: { internalLinkBy: "mse-25.47", internalLinkTarget: "engagements" },
      visibleDesktop: true,
      visibleMobile: true,
    }],
  };
}

function rollout(p) {
  return {
    reportFingerprint: "r".repeat(64),
    result: { ok: true, dryRun: false, pagesWritten: 1 },
    rollbackManifest: [{
      agencyId: 4,
      siteSlug: "gien",
      pageSlug: "services",
      targetSnapshotFingerprint: digest(saveBody(p)),
    }],
  };
}

test("post-rollout certification uses persisted link and target snapshot as closure authority", () => {
  const p = page();
  const report = buildPostRolloutValidation({
    rollout: rollout(p),
    currentPages: [{ siteSlug: "gien", agencyId: 4, pageSlug: "services", page: p }],
    preview: { agencies: [{ site: { slug: "gien" }, topicGraph: { orphanPages: ["engagements"] } }] },
  });
  assert.equal(report.summary.targetCount, 1);
  assert.equal(report.summary.closedTargetCount, 1);
  assert.equal(report.summary.openTargetCount, 0);
  assert.equal(report.summary.persistedLinkCount, 1);
  assert.equal(report.summary.targetSnapshotMatchCount, 1);
  assert.equal(report.summary.semanticGraphReportedOrphanCount, 1);
  assert.equal(report.summary.closureCertified, true);
  assert.equal(report.targets[0].semanticGraphOrphan, true);
  assert.equal(report.targets[0].closed, true);
});

test("post-rollout certification fails closure when persisted link is missing", () => {
  const target = page();
  const current = page();
  current.blocks[0].content.html = "<p>Notre équipe vous accompagne.</p>";
  current.blocks[0].seo = {};
  const report = buildPostRolloutValidation({
    rollout: rollout(target),
    currentPages: [{ siteSlug: "gien", agencyId: 4, pageSlug: "services", page: current }],
  });
  assert.equal(report.summary.closedTargetCount, 0);
  assert.equal(report.summary.openTargetCount, 1);
  assert.equal(report.summary.closureCertified, false);
});
