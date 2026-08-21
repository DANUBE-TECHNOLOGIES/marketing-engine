"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { saveBody } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");
const { digest, executeResidualWriteIntent } = require("../src/modules/minisite-semantic-engine/residual-executor");

function page() {
  return {
    title: "Nos services",
    slug: "services",
    status: "published",
    published: true,
    seoTitle: "Services à Gien",
    metaDescription: "Services de voyage à Gien",
    blocks: [{ id: 1, type: "hero", status: "published", position: 0, content: { title: "Nos services" }, settings: {}, seo: {}, visibleDesktop: true, visibleMobile: true }],
  };
}

function writeIntent() {
  const before = saveBody(page());
  const after = JSON.parse(JSON.stringify(before));
  after.blocks.push({ type: "rich_text", status: "published", position: 1, content: { title: "Billetterie et vols à Gien", html: "<p>Contenu.</p>", alignment: "left" }, settings: {}, seo: { generatedBy: "mse-25.40", intentKey: "ticketing" }, visibleDesktop: true, visibleMobile: true });
  const base = {
    version: "mse-25.40",
    operation: "residual-semantic-write-intent",
    readOnly: true,
    writes: false,
    publicWrites: false,
    residualExecutionFingerprint: "a".repeat(64),
    intents: [{
      key: "gien:services",
      agencyId: 4,
      siteSlug: "gien",
      pageSlug: "services",
      sourceSnapshotFingerprint: digest(before),
      targetSnapshotFingerprint: digest(after),
      persistence: { agencyId: 4, pageSlug: "services", body: after },
    }],
  };
  return { ...base, writeIntentFingerprint: digest(base) };
}

function service(current = page()) {
  const calls = [];
  return {
    calls,
    get: async () => current,
    save: async (agencyId, pageSlug, body, metadata) => { calls.push({ type: "save", agencyId, pageSlug, body, metadata }); return {}; },
    versions: async () => ({ items: [{ id: "version-9", version: 9 }] }),
    rollback: async (agencyId, pageSlug, versionId, metadata) => { calls.push({ type: "rollback", agencyId, pageSlug, versionId, metadata }); return {}; },
  };
}

test("dry-run performs no persistence", async () => {
  const intent = writeIntent();
  const fake = service();
  const result = await executeResidualWriteIntent({ writeIntent: intent, service: fake, approvedWriteIntentFingerprint: intent.writeIntentFingerprint, dryRun: true });
  assert.equal(result.writes, false);
  assert.equal(result.pagesWritten, 0);
  assert.equal(fake.calls.length, 0);
});

test("real execution requires explicit confirmation and matching source snapshot", async () => {
  const intent = writeIntent();
  await assert.rejects(
    executeResidualWriteIntent({ writeIntent: intent, service: service(), approvedWriteIntentFingerprint: intent.writeIntentFingerprint, dryRun: false }),
    (error) => error.code === "MSE_25_40_EXECUTOR_CONFIRMATION_REQUIRED"
  );

  const changed = page();
  changed.metaDescription = "Modification manuelle concurrente";
  await assert.rejects(
    executeResidualWriteIntent({ writeIntent: intent, service: service(changed), approvedWriteIntentFingerprint: intent.writeIntentFingerprint, dryRun: false, confirm: true }),
    (error) => error.code === "MSE_25_40_EXECUTION_COMPENSATED" && error.details.originalError.code === "MSE_25_40_EXECUTOR_SOURCE_CHANGED"
  );
});

test("real execution creates a versioned rollback snapshot before applying", async () => {
  const intent = writeIntent();
  const fake = service();
  const result = await executeResidualWriteIntent({ writeIntent: intent, service: fake, approvedWriteIntentFingerprint: intent.writeIntentFingerprint, dryRun: false, confirm: true });
  assert.equal(result.writes, true);
  assert.equal(result.pagesWritten, 1);
  assert.equal(result.rollbackSnapshots, 1);
  assert.equal(result.rollbackReady, true);
  assert.equal(fake.calls.length, 2);
  assert.equal(fake.calls[0].type, "save");
  assert.equal(fake.calls[0].metadata.reason, "mse-25.40:pre-apply-snapshot");
  assert.equal(fake.calls[1].metadata.reason, "mse-25.40:residual-semantic-apply");
  assert.equal(result.rollbackManifest[0].rollbackVersionId, "version-9");
});
