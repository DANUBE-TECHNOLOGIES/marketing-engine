"use strict";

const { digest, validatedSaveBody } = require("./quality-uplift-write-intent");

function applyError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = 409;
  error.details = details;
  return error;
}

function explicitConfirmation(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function assertWriteIntentIntegrity(writeIntent = {}) {
  if (writeIntent.version !== "mse-25.31" || writeIntent.operation !== "quality-uplift-write-intent") {
    throw applyError("MSE_25_31_APPLY_WRITE_INTENT_CONTRACT_INVALID", "Le write-intent MSE-25.31 n'a pas un contrat reconnu.");
  }
  if (writeIntent.readOnly !== true || writeIntent.writes !== false || writeIntent.publicWrites !== false || writeIntent.persistenceCallsPerformed !== 0) {
    throw applyError("MSE_25_31_APPLY_WRITE_INTENT_SAFETY_INVALID", "Le write-intent fourni n'est pas un artefact read-only valide.");
  }
  const expected = digest({ version: "mse-25.31", executionPlanFingerprint: writeIntent.executionPlanFingerprint, intents: writeIntent.intents || [] });
  if (!/^[0-9a-f]{64}$/.test(String(writeIntent.writeIntentFingerprint || "")) || writeIntent.writeIntentFingerprint !== expected) {
    throw applyError("MSE_25_31_APPLY_WRITE_INTENT_FINGERPRINT_MISMATCH", "Le fingerprint du write-intent ne correspond pas à son contenu.", { actual: writeIntent.writeIntentFingerprint || null, expected });
  }
  return writeIntent;
}

function requirePersistence(persistence) {
  for (const method of ["get", "save", "versions", "rollback"]) {
    if (typeof persistence?.[method] !== "function") throw applyError("MSE_25_31_APPLY_PERSISTENCE_UNAVAILABLE", `PageBuilderPersistenceService.${method} est requis.`);
  }
  return persistence;
}

async function createRollbackSnapshot(persistence, intent, createdBy) {
  const current = await persistence.get({ agencyId: intent.agencyId, pageSlug: intent.pageSlug });
  const snapshot = await persistence.save({
    agencyId: intent.agencyId,
    pageSlug: intent.pageSlug,
    body: validatedSaveBody(current, { key: intent.key, phase: "rollback-snapshot" }),
    metadata: { reason: "mse-25.31-quality-uplift-pre-apply-snapshot", createdBy },
  });
  const versions = await persistence.versions({ agencyId: intent.agencyId, pageSlug: intent.pageSlug });
  const row = (versions.items || []).find((item) => Number(item.version) === Number(snapshot.version));
  if (!row?.id) throw applyError("MSE_25_31_APPLY_ROLLBACK_SNAPSHOT_MISSING", "Le snapshot de rollback MSE-25.31 est introuvable.", { key: intent.key, snapshotVersion: snapshot.version || null });
  return { version: snapshot.version || null, versionId: row.id };
}

async function compensate(persistence, applied = [], createdBy) {
  const restored = [];
  const failures = [];
  for (const item of [...applied].reverse()) {
    try {
      const result = await persistence.rollback({
        agencyId: item.agencyId,
        pageSlug: item.pageSlug,
        versionId: item.rollbackVersionId,
        metadata: { reason: "mse-25.31-quality-uplift-auto-compensation", createdBy, failedAppliedVersion: item.appliedVersion || null },
      });
      restored.push({ key: item.key, rollbackVersionId: item.rollbackVersionId, restoredVersion: result?.version || null });
    } catch (error) {
      failures.push({ key: item.key, rollbackVersionId: item.rollbackVersionId, error: error?.code || "MSE_25_31_APPLY_COMPENSATION_PAGE_FAILED", message: error?.message || String(error) });
    }
  }
  return { restored, failures };
}

async function applyQualityUpliftWriteIntent({ writeIntent, persistence, dryRun = true, confirm = false, approvedWriteIntentFingerprint, createdBy = "mse-25.31-quality-uplift" } = {}) {
  const intent = assertWriteIntentIntegrity(writeIntent);
  const expectedFingerprint = String(approvedWriteIntentFingerprint || "").trim().toLowerCase();
  if (dryRun !== false) {
    return { operation: "preview-quality-uplift-apply", dryRun: true, writes: false, publicWrites: false, writeIntentFingerprint: intent.writeIntentFingerprint, pagesPlanned: (intent.intents || []).length };
  }
  if (!explicitConfirmation(confirm)) throw applyError("MSE_25_31_APPLY_CONFIRMATION_REQUIRED", "L'apply MSE-25.31 exige confirm=true.");
  if (!/^[0-9a-f]{64}$/.test(expectedFingerprint)) throw applyError("MSE_25_31_APPLY_WRITE_INTENT_FINGERPRINT_REQUIRED", "Le fingerprint du write-intent approuvé est obligatoire.");
  if (expectedFingerprint !== intent.writeIntentFingerprint) throw applyError("MSE_25_31_APPLY_WRITE_INTENT_FINGERPRINT_MISMATCH", "Le fingerprint approuvé ne correspond pas au write-intent final.", { approved: expectedFingerprint, actual: intent.writeIntentFingerprint });
  const service = requirePersistence(persistence);
  const applied = [];
  const results = [];
  let rollbackSnapshots = 0;
  try {
    for (const row of intent.intents || []) {
      const rollback = await createRollbackSnapshot(service, row, createdBy);
      rollbackSnapshots += 1;
      const saved = await service.save({
        agencyId: row.agencyId,
        pageSlug: row.pageSlug,
        body: row.persistence.body,
        metadata: { reason: "mse-25.31-quality-uplift-apply", createdBy, writeIntentFingerprint: intent.writeIntentFingerprint },
      });
      applied.push({ key: row.key, agencyId: row.agencyId, pageSlug: row.pageSlug, rollbackVersionId: rollback.versionId, appliedVersion: saved.version || null });
      results.push({ key: row.key, agencyId: row.agencyId, pageSlug: row.pageSlug, changed: true, version: saved.version || null, rollbackVersionId: rollback.versionId });
    }
  } catch (cause) {
    const compensation = await compensate(service, applied, `${createdBy}:auto-compensation`);
    const incomplete = compensation.failures.length > 0;
    const error = applyError(
      incomplete ? "MSE_25_31_APPLY_COMPENSATION_FAILED" : "MSE_25_31_APPLY_COMPENSATED",
      incomplete ? "L'apply MSE-25.31 a échoué et sa compensation est incomplète." : "L'apply MSE-25.31 a échoué ; les pages déjà écrites ont été restaurées.",
      { originalError: { code: cause?.code || null, message: cause?.message || String(cause) }, pagesWrittenBeforeFailure: applied.length, rollbackSnapshots, compensatedCount: compensation.restored.length, compensationFailureCount: compensation.failures.length, compensated: compensation.restored, compensationFailures: compensation.failures }
    );
    error.cause = cause;
    throw error;
  }
  return { operation: "quality-uplift-apply", dryRun: false, writes: true, publicWrites: true, versioned: true, rollbackReady: true, automaticallyCompensatedOnFailure: true, writeIntentFingerprint: intent.writeIntentFingerprint, summary: { pagesWritten: results.length, rollbackSnapshots }, pages: results };
}

module.exports = { applyQualityUpliftWriteIntent, assertWriteIntentIntegrity, compensate, createRollbackSnapshot, explicitConfirmation, requirePersistence };
