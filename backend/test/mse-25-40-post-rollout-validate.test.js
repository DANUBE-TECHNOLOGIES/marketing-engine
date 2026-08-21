"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run, writtenTargets } = require("../scripts/mse-25-40-post-rollout-validate");

function network({ ticketingStatus = "covered" } = {}) {
  return {
    planFingerprint: "a".repeat(64),
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      pages: [
        { pageId: "services-id", slug: "services", primaryIntent: "services", primaryIntentScore: 100, localityScore: 70 },
      ],
      coverage: [
        { intentKey: "services", status: "strong", bestPageSlug: "services", bestScore: 100, bestLocalityScore: 70, candidatePages: [] },
        { intentKey: "ticketing", status: ticketingStatus, bestPageSlug: "services", bestScore: ticketingStatus === "gap" ? 40 : 48, bestLocalityScore: 70, candidatePages: [{ slug: "services", score: ticketingStatus === "gap" ? 40 : 48, localityScore: 70, managedRoute: false }] },
      ],
      semanticProposals: {
        proposals: [{
          type: "existing-page-semantic-uplift",
          intentKey: "ticketing",
          pageSlug: "services",
          valueScore: 98,
          reason: "intent-weak",
          proposed: {
            editorialBrief: { heading: "Billetterie et vols à Gien", targetWords: 180, requiredThemes: [], forbiddenPatterns: [] },
            internalLinks: [],
          },
        }],
      },
    }],
  };
}

function generated(intentKey, html) {
  return {
    type: "rich_text",
    content: { html },
    seo: { generatedBy: "mse-25.40", purpose: "residual-semantic-uplift", intentKey },
  };
}

function writeIntent() {
  return {
    version: "mse-25.40",
    operation: "residual-semantic-write-intent",
    writeIntentFingerprint: "b".repeat(64),
    intents: [{
      siteSlug: "gien",
      agencyId: 4,
      pageSlug: "services",
      targetSnapshotFingerprint: "c".repeat(64),
      snapshot: {
        before: { blocks: [] },
        after: { blocks: [generated("ticketing", "Billetterie et vols")] },
      },
    }],
  };
}

function rollout(writeFile) {
  return {
    type: "mse-25.40-network-rollout-report",
    reportFingerprint: "d".repeat(64),
    context: { tenantSlug: "mondescale" },
    proof: { writeIntentPath: writeFile, writeIntentFingerprint: "b".repeat(64) },
    result: {
      ok: true,
      dryRun: false,
      writes: true,
      publicWrites: true,
      versioned: true,
      rollbackReady: true,
    },
    rollbackManifest: [],
  };
}

function tempFiles() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-40-post-"));
  const writeFile = path.join(dir, "write.json");
  const rolloutFile = path.join(dir, "rollout.json");
  fs.writeFileSync(writeFile, JSON.stringify(writeIntent()));
  fs.writeFileSync(rolloutFile, JSON.stringify(rollout(writeFile)));
  return { dir, writeFile, rolloutFile };
}

test("post-rollout validator certifies a covered written intent and zero residual action", async () => {
  const files = tempFiles();
  const result = await run({
    rolloutReportPath: files.rolloutFile,
    writeIntentPath: files.writeFile,
    output: path.join(files.dir, "post.json"),
    emitOutput: false,
    previewRunner: async () => network({ ticketingStatus: "covered" }),
  });
  assert.equal(result.closureCertified, true);
  assert.equal(result.result.summary.targetCount, 1);
  assert.equal(result.result.summary.closedTargetCount, 1);
  assert.equal(result.result.summary.openTargetCount, 0);
  assert.equal(result.result.summary.residualExecutablePageCount, 0);
  assert.equal(result.result.targets[0].suppressionReason, "intent-covered-on-target-page");
});

test("post-rollout validator fails closed while a written intent is still a residual gap", async () => {
  const files = tempFiles();
  await assert.rejects(
    () => run({
      rolloutReportPath: files.rolloutFile,
      writeIntentPath: files.writeFile,
      output: path.join(files.dir, "post.json"),
      emitOutput: false,
      previewRunner: async () => network({ ticketingStatus: "gap" }),
    }),
    (error) => error.code === "MSE_25_40_POST_ROLLOUT_CLOSURE_NOT_CERTIFIED"
  );
});

test("corrective rollout validates only the generated intent that actually changed", () => {
  const unchangedStay = generated("stay", "Séjours inchangés");
  const beforeTicketing = generated("ticketing", "Ancienne billetterie");
  const afterTicketing = generated("ticketing", "Nouvelle billetterie");
  const corrective = {
    intents: [{
      siteSlug: "lamorlaye",
      agencyId: 7,
      pageSlug: "services",
      targetSnapshotFingerprint: "e".repeat(64),
      snapshot: {
        before: { blocks: [beforeTicketing, unchangedStay] },
        after: { blocks: [afterTicketing, unchangedStay] },
      },
    }],
  };
  const targets = writtenTargets(corrective);
  assert.deepEqual(targets.map((row) => row.intentKey), ["ticketing"]);
});
