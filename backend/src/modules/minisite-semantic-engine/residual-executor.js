"use strict";

const crypto = require("node:crypto");
const { saveBody } = require("../minisite-seo-enrichment/quality-uplift-write-intent");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function explicitTrue(value) { return value === true || String(value || "").trim().toLowerCase() === "true"; }
function error(code, message, details = {}) { const e = new Error(message); e.code = code; e.status = 409; e.details = details; return e; }

function assertWriteIntent(writeIntent = {}, approvedFingerprint) {
  if (
    writeIntent.version !== "mse-25.40"
    || writeIntent.operation !== "residual-semantic-write-intent"
    || writeIntent.readOnly !== true
    || writeIntent.writes !== false
    || writeIntent.publicWrites !== false
    || !Array.isArray(writeIntent.intents)
  ) throw error("MSE_25_40_EXECUTOR_WRITE_INTENT_INVALID", "Le write-intent MSE-25.40 n'est pas reconnu.");

  const expected = String(approvedFingerprint || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) throw error("MSE_25_40_EXECUTOR_FINGERPRINT_REQUIRED", "Le fingerprint SHA-256 du write-intent approuvé est obligatoire.");
  if (expected !== String(writeIntent.writeIntentFingerprint || "").trim().toLowerCase()) throw error("MSE_25_40_EXECUTOR_FINGERPRINT_MISMATCH", "Le write-intent ne correspond pas au fingerprint explicitement approuvé.");
}

async function assertCurrentSnapshot(service, intent) {
  const current = await service.get(intent.agencyId, intent.pageSlug);
  const body = saveBody(current);
  const actual = digest(body);
  const expected = String(intent.sourceSnapshotFingerprint || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected) || actual !== expected) {
    throw error("MSE_25_40_EXECUTOR_SOURCE_CHANGED", "La page Website Designer a changé depuis la création du write-intent ; aucune écriture n'est autorisée.", {
      agencyId: intent.agencyId,
      siteSlug: intent.siteSlug,
      pageSlug: intent.pageSlug,
      expectedSourceSnapshotFingerprint: expected || null,
      actualSourceSnapshotFingerprint: actual,
    });
  }
  return { current, body, fingerprint: actual };
}

async function createRollbackSnapshot(service, intent, currentBody, metadata = {}) {
  await service.save(intent.agencyId, intent.pageSlug, currentBody, {
    ...metadata,
    reason: metadata.reason || "mse-25.40:pre-apply-snapshot",
  });
  const versions = await service.versions(intent.agencyId, intent.pageSlug);
  const latest = Array.isArray(versions?.items) ? versions.items[0] : null;
  if (!latest?.id) throw error("MSE_25_40_ROLLBACK_SNAPSHOT_MISSING", "Le snapshot de rollback Website Designer V2 n'a pas pu être certifié.", { agencyId: intent.agencyId, pageSlug: intent.pageSlug });
  return { agencyId: intent.agencyId, siteSlug: intent.siteSlug, pageSlug: intent.pageSlug, versionId: latest.id, version: latest.version ?? null };
}

async function compensate(service, applied = [], metadata = {}) {
  const compensated = [];
  const failures = [];
  for (const item of [...applied].reverse()) {
    try {
      await service.rollback(item.intent.agencyId, item.intent.pageSlug, item.snapshot.versionId, { ...metadata, reason: "mse-25.40:automatic-compensation" });
      compensated.push({ agencyId: item.intent.agencyId, siteSlug: item.intent.siteSlug, pageSlug: item.intent.pageSlug, rollbackVersionId: item.snapshot.versionId });
    } catch (cause) {
      failures.push({ agencyId: item.intent.agencyId, siteSlug: item.intent.siteSlug, pageSlug: item.intent.pageSlug, rollbackVersionId: item.snapshot.versionId, error: cause.code || cause.name || "ROLLBACK_FAILED", message: cause.message });
    }
  }
  return { compensated, failures };
}

async function executeResidualWriteIntent({ writeIntent = {}, service, dryRun = true, confirm = false, approvedWriteIntentFingerprint, metadata = {} } = {}) {
  if (!service || typeof service.get !== "function" || typeof service.save !== "function" || typeof service.versions !== "function" || typeof service.rollback !== "function") {
    throw new TypeError("Un PageBuilderPersistenceService compatible est obligatoire.");
  }
  assertWriteIntent(writeIntent, approvedWriteIntentFingerprint);

  if (dryRun !== false) {
    return {
      ok: true,
      dryRun: true,
      writes: false,
      publicWrites: false,
      residualExecutionFingerprint: writeIntent.residualExecutionFingerprint,
      writeIntentFingerprint: writeIntent.writeIntentFingerprint,
      pagesPlanned: writeIntent.intents.length,
      pagesWritten: 0,
      rollbackSnapshots: 0,
      resultFingerprint: digest({ writeIntentFingerprint: writeIntent.writeIntentFingerprint, pagesPlanned: writeIntent.intents.length }),
    };
  }
  if (!explicitTrue(confirm)) throw error("MSE_25_40_EXECUTOR_CONFIRMATION_REQUIRED", "L'exécution réelle MSE-25.40 exige confirm=true.");

  const applied = [];
  try {
    for (const intent of writeIntent.intents) {
      const current = await assertCurrentSnapshot(service, intent);
      const snapshot = await createRollbackSnapshot(service, intent, current.body, { ...metadata, reason: "mse-25.40:pre-apply-snapshot" });
      await service.save(intent.persistence.agencyId, intent.persistence.pageSlug, intent.persistence.body, { ...metadata, reason: "mse-25.40:residual-semantic-apply" });
      applied.push({ intent, snapshot });
    }
  } catch (originalError) {
    const compensation = await compensate(service, applied, metadata);
    throw error(
      compensation.failures.length ? "MSE_25_40_EXECUTION_COMPENSATION_FAILED" : "MSE_25_40_EXECUTION_COMPENSATED",
      compensation.failures.length
        ? "Le rollout MSE-25.40 a échoué et au moins une restauration automatique a également échoué."
        : "Le rollout MSE-25.40 a échoué ; les écritures déjà appliquées ont été restaurées automatiquement.",
      {
        originalError: { code: originalError.code || originalError.name || "EXECUTION_FAILED", message: originalError.message, details: originalError.details || {} },
        pagesWrittenBeforeFailure: applied.length,
        compensatedCount: compensation.compensated.length,
        compensationFailureCount: compensation.failures.length,
        compensated: compensation.compensated,
        compensationFailures: compensation.failures,
      }
    );
  }

  const rollbackManifest = applied.map(({ intent, snapshot }) => ({
    agencyId: intent.agencyId,
    siteSlug: intent.siteSlug,
    pageSlug: intent.pageSlug,
    rollbackVersionId: snapshot.versionId,
    rollbackVersion: snapshot.version,
    sourceSnapshotFingerprint: intent.sourceSnapshotFingerprint,
    targetSnapshotFingerprint: intent.targetSnapshotFingerprint,
  }));

  return {
    ok: true,
    dryRun: false,
    writes: true,
    publicWrites: true,
    versioned: true,
    rollbackReady: rollbackManifest.length === writeIntent.intents.length,
    residualExecutionFingerprint: writeIntent.residualExecutionFingerprint,
    writeIntentFingerprint: writeIntent.writeIntentFingerprint,
    pagesPlanned: writeIntent.intents.length,
    pagesWritten: applied.length,
    rollbackSnapshots: rollbackManifest.length,
    rollbackManifest,
    resultFingerprint: digest({ writeIntentFingerprint: writeIntent.writeIntentFingerprint, rollbackManifest }),
  };
}

module.exports = {
  assertCurrentSnapshot,
  assertWriteIntent,
  compensate,
  createRollbackSnapshot,
  digest,
  executeResidualWriteIntent,
  explicitTrue,
};
