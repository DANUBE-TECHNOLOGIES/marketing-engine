"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildInternalLinkProof } = require("../src/modules/minisite-semantic-engine/internal-link-proof");

function evidence() {
  return {
    evidenceFingerprint: "e".repeat(64),
    readOnly: true,
    writes: false,
    policy: { automaticWrites: false },
    items: [{
      siteSlug: "gien",
      agencyId: 4,
      city: "Gien",
      targetPageSlug: "engagements",
      preferredSource: { pageSlug: "services", sourceIntent: "services" },
    }],
  };
}

function currentPage(html = "<p>Nos services et notre accompagnement vous aident à préparer votre voyage.</p>") {
  return [{
    siteSlug: "gien",
    agencyId: 4,
    pageSlug: "services",
    page: {
      slug: "services",
      title: "Services",
      blocks: [
        { type: "hero", content: { title: "Nos services" } },
        { type: "rich_text", content: { title: "Votre agence vous accompagne", html } },
        { type: "rich_text", seo: { generatedBy: "mse-25.40" }, content: { title: "Billetterie", html: "<p>Billets d’avion.</p>" } },
      ],
    },
  }];
}

test("proof selects an existing contextual rich-text block and seals exact link proposal", () => {
  const report = buildInternalLinkProof(evidence(), currentPage());
  assert.equal(report.summary.targetCount, 1);
  assert.equal(report.summary.proofCompleteCount, 1);
  assert.equal(report.summary.sealedLinkCandidateCount, 1);
  assert.equal(report.policy.richTextSourceRequired, true);
  assert.equal(report.items[0].sourcePageSlug, "services");
  assert.equal(report.items[0].targetHref, "/engagements");
  assert.equal(report.items[0].anchorText, "Découvrir nos engagements");
  assert.equal(report.items[0].preferredBlock.index, 1);
  assert.equal(report.items[0].preferredBlock.type, "rich_text");
  assert.equal(report.items[0].existingLinkDetected, false);
  assert.match(report.items[0].sourceSnapshotFingerprint, /^[0-9a-f]{64}$/);
});

test("proof never seals html onto a non-rich-text block even when its contextual score is higher", () => {
  const rows = currentPage();
  rows[0].page.blocks.unshift({
    type: "image_text",
    content: {
      title: "Nos services, conseils et accompagnement",
      text: "Services, accompagnement et conseil pour votre voyage.",
      imageUrl: "",
      imageAlt: "",
      imagePosition: "left",
    },
  });
  const report = buildInternalLinkProof(evidence(), rows);
  assert.equal(report.summary.sealedLinkCandidateCount, 1);
  assert.equal(report.items[0].preferredBlock.type, "rich_text");
  assert.equal(report.items[0].preferredBlock.index, 2);
});

test("proof requires manual block review when no rich-text source exists", () => {
  const rows = currentPage();
  rows[0].page.blocks = [
    { type: "hero", content: { title: "Nos services" } },
    { type: "image_text", content: { title: "Nos services", text: "Notre accompagnement et nos conseils." } },
  ];
  const report = buildInternalLinkProof(evidence(), rows);
  assert.equal(report.summary.proofCompleteCount, 0);
  assert.equal(report.summary.manualBlockReviewCount, 1);
  assert.equal(report.items[0].preferredBlock, null);
  assert.equal(report.items[0].decision, "manual-block-review");
});

test("proof detects an existing engagement link and refuses a duplicate candidate", () => {
  const report = buildInternalLinkProof(evidence(), currentPage('<p>Nos services. <a href="/engagements">Découvrir nos engagements</a></p>'));
  assert.equal(report.summary.alreadyLinkedCount, 1);
  assert.equal(report.summary.sealedLinkCandidateCount, 0);
  assert.equal(report.items[0].decision, "already-linked");
  assert.equal(report.items[0].proofComplete, false);
});

test("proof fails closed on unsafe evidence", () => {
  assert.throws(() => buildInternalLinkProof({ ...evidence(), writes: true }, currentPage()), /read-only/);
});
