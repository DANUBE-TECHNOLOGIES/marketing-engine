"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { applyQualityUpliftWriteIntent } = require("../src/modules/minisite-seo-enrichment/quality-uplift-apply-executor");
const { digest } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");

function writeIntent(intents = []) {
  const base = {
    version: "mse-25.31",
    operation: "quality-uplift-write-intent",
    readOnly: true,
    writes: false,
    publicWrites: false,
    persistenceCallsPerformed: 0,
    executionPlanFingerprint: "a".repeat(64),
    intents,
  };
  return {
    ...base,
    writeIntentFingerprint: digest({ version: "mse-25.31", executionPlanFingerprint: base.executionPlanFingerprint, intents }),
  };
}

function intent(key = "gien:avis") {
  return {
    key,
    agencyId: 1,
    siteSlug: "gien",
    pageSlug: key.split(":")[1],
    persistence: {
      method: "PageBuilderPersistenceService.save",
      agencyId: 1,
      pageSlug: key.split(":")[1],
      body: {
        page: { title: "Avis clients", slug: "avis", status: "published", seoTitle: "Avis Gien", metaDescription: "Avis", published: true },
        blocks: [{ type: "rich_text", status: "published", position: 0, content: { title: "Avis", html: "<p>Contenu</p>", alignment: "left" }, settings: {}, seo: {}, visibleDesktop: true, visibleMobile: true }],
      },
    },
  };
}

function fakePersistence({ failOnFinalSave = null, failRollback = false } = {}) {
  const calls = [];
  let version = 0;
  return {
    calls,
    async get({ agencyId, pageSlug }) {
      calls.push(["get", pageSlug]);
      return { id: `page-${pageSlug}`, title: "Avis clients", slug: pageSlug, status: "published", published: true, seoTitle: "Avant", metaDescription: "Avant", blocks: [{ id: `copy-${pageSlug}`, type: "rich_text", status: "published", position: 0, content: { title: "Avant", html: "<p>Avant</p>", alignment: "left" } }] };
    },
    async save({ pageSlug, metadata }) {
      calls.push(["save", pageSlug, metadata.reason]);
      version += 1;
      if (metadata.reason === "mse-25.31-quality-uplift-apply" && failOnFinalSave === pageSlug) {
        const error = new Error("save failed");
        error.code = "SAVE_FAILED";
        throw error;
      }
      return { id: `page-${pageSlug}`, slug: pageSlug, version };
    },
    async versions({ pageSlug }) {
      calls.push(["versions", pageSlug]);
      return { items: [{ id: `version-${pageSlug}-${version}`, version }] };
    },
    async rollback({ pageSlug, versionId }) {
      calls.push(["rollback", pageSlug, versionId]);
      if (failRollback) {
        const error = new Error("rollback failed");
        error.code = "ROLLBACK_FAILED";
        throw error;
      }
      return { version: ++version };
    },
  };
}

test("apply executor remains no-write in dry-run mode", async () => {
  const persistence = fakePersistence();
  const artifact = writeIntent([intent()]);
  const result = await applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence });
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, false);
  assert.equal(result.pagesPlanned, 1);
  assert.deepEqual(persistence.calls, []);
});

test("apply executor requires explicit confirmation and approved write-intent fingerprint", async () => {
  const persistence = fakePersistence();
  const artifact = writeIntent([intent()]);
  await assert.rejects(
    () => applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence, dryRun: false, approvedWriteIntentFingerprint: artifact.writeIntentFingerprint }),
    (error) => error.code === "MSE_25_31_APPLY_CONFIRMATION_REQUIRED"
  );
  await assert.rejects(
    () => applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence, dryRun: false, confirm: true }),
    (error) => error.code === "MSE_25_31_APPLY_WRITE_INTENT_FINGERPRINT_REQUIRED"
  );
  assert.deepEqual(persistence.calls, []);
});

test("apply executor snapshots then writes each page through Website Designer persistence", async () => {
  const persistence = fakePersistence();
  const artifact = writeIntent([intent()]);
  const result = await applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence, dryRun: false, confirm: true, approvedWriteIntentFingerprint: artifact.writeIntentFingerprint });
  assert.equal(result.writes, true);
  assert.equal(result.versioned, true);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.summary.pagesWritten, 1);
  assert.deepEqual(persistence.calls.map((call) => call[0]), ["get", "save", "versions", "save"]);
  assert.equal(persistence.calls[1][2], "mse-25.31-quality-uplift-pre-apply-snapshot");
  assert.equal(persistence.calls[3][2], "mse-25.31-quality-uplift-apply");
});

test("apply executor compensates pages already written when a later page fails", async () => {
  const persistence = fakePersistence({ failOnFinalSave: "services" });
  const artifact = writeIntent([intent("gien:avis"), intent("gien:services")]);
  await assert.rejects(
    () => applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence, dryRun: false, confirm: true, approvedWriteIntentFingerprint: artifact.writeIntentFingerprint }),
    (error) => {
      assert.equal(error.code, "MSE_25_31_APPLY_COMPENSATED");
      assert.equal(error.details.pagesWrittenBeforeFailure, 1);
      assert.equal(error.details.compensatedCount, 1);
      return true;
    }
  );
  assert.ok(persistence.calls.some((call) => call[0] === "rollback" && call[1] === "avis"));
});

test("apply executor exposes incomplete compensation as a separate blocking failure", async () => {
  const persistence = fakePersistence({ failOnFinalSave: "services", failRollback: true });
  const artifact = writeIntent([intent("gien:avis"), intent("gien:services")]);
  await assert.rejects(
    () => applyQualityUpliftWriteIntent({ writeIntent: artifact, persistence, dryRun: false, confirm: true, approvedWriteIntentFingerprint: artifact.writeIntentFingerprint }),
    (error) => {
      assert.equal(error.code, "MSE_25_31_APPLY_COMPENSATION_FAILED");
      assert.equal(error.details.compensationFailureCount, 1);
      return true;
    }
  );
});
