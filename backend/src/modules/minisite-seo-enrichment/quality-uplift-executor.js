"use strict";

const crypto = require("node:crypto");

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function explicitTrue(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function executorError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = 409;
  error.details = details;
  return error;
}

function currentBody(page = {}) {
  return {
    page: {
      title: page.title,
      slug: page.slug,
      status: page.status || (page.published === true ? "published" : "draft"),
      seoTitle: page.seoTitle || "",
      metaDescription: page.metaDescription ?? page.seoDescription ?? "",
      published: page.published === true,
    },
    blocks: (page.blocks || []).map((block, index) => ({
      type: block.type || block.blockType,
      status: block.status || "published",
      position: Number.isFinite(Number(block.position ?? block.displayOrder))
        ? Number(block.position ?? block.displayOrder)
        : index,
      content: JSON.parse(JSON.stringify(block.content || {})),
      settings: JSON.parse(JSON.stringify(block.settings || {})),
      seo: JSON.parse(JSON.stringify(block.seo || {})),
      visibleDesktop: block.visibleDesktop !== false,
      visibleMobile: block.visibleMobile !== false,
    })),
  };
}

async function createRollbackSnapshot(service, intent, metadata = {}) {
  const current = await service.get(intent.agencyId, intent.pageSlug);
  await service.save(
    intent.agencyId,
    intent.pageSlug,
    currentBody(current),
    {
      ...metadata,
      reason: metadata.reason || "mse-25.31:pre-apply-snapshot",
    }
  );
  const versions = await service.versions(intent.agencyId, intent.pageSlug);
  const latest = Array.isArray(versions?.items) ? versions.items[0] : null;
  if (!latest?.id) {
    throw executorError(
      "MSE_25_31_ROLLBACK_SNAPSHOT_MISSING",
      "Le snapshot de rollback Website Designer V2 n'a pas pu être certifié.",
      { agencyId: intent.agencyId, pageSlug: intent.pageSlug }
    );
  }
  return {
    agencyId: intent.agencyId,
    siteSlug: intent.siteSlug,
    pageSlug: intent.pageSlug,
    versionId: latest.id,
    version: latest.version ?? null,
  };
}

async function compensate(service, applied = [], metadata = {}) {
  const compensated = [];
  const failures = [];
  for (const item of [...applied].reverse()) {
    try {
      await service.rollback(
        item.intent.agencyId,
        item.intent.pageSlug,
        item.snapshot.versionId,
        {
          ...metadata,
          reason: "mse-25.31:automatic-compensation",
        }
      );
      compensated.push({
        agencyId: item.intent.agencyId,
        siteSlug: item.intent.siteSlug,
        pageSlug: item.intent.pageSlug,
        rollbackVersionId: item.snapshot.versionId,
      });
    } catch (error) {
      failures.push({
        agencyId: item.intent.agencyId,
        siteSlug: item.intent.siteSlug,
        pageSlug: item.intent.pageSlug,
        rollbackVersionId: item.snapshot.versionId,
        error: error.code || error.name || "ROLLBACK_FAILED",
        message: error.message,
      });
    }
  }
  return { compensated, failures };
}

async function executeQualityUpliftWriteIntent({
  writeIntent = {},
  service,
  dryRun = true,
  confirm = false,
  approvedWriteIntentFingerprint,
  metadata = {},
} = {}) {
  if (!service || typeof service.get !== "function" || typeof service.save !== "function" || typeof service.rollback !== "function") {
    throw new TypeError("Un PageBuilderPersistenceService compatible est obligatoire.");
  }
  if (
    writeIntent.version !== "mse-25.31"
    || writeIntent.operation !== "quality-uplift-write-intent"
    || writeIntent.readOnly !== true
    || writeIntent.writes !== false
    || writeIntent.publicWrites !== false
    || !Array.isArray(writeIntent.intents)
  ) {
    throw executorError("MSE_25_31_EXECUTOR_WRITE_INTENT_INVALID", "Le write-intent MSE-25.31 n'est pas reconnu.");
  }

  const expectedFingerprint = String(approvedWriteIntentFingerprint || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedFingerprint)) {
    throw executorError("MSE_25_31_EXECUTOR_FINGERPRINT_REQUIRED", "Le fingerprint SHA-256 du write-intent approuvé est obligatoire.");
  }
  if (expectedFingerprint !== String(writeIntent.writeIntentFingerprint || "").trim().toLowerCase()) {
    throw executorError("MSE_25_31_EXECUTOR_FINGERPRINT_MISMATCH", "Le write-intent ne correspond pas au fingerprint explicitement approuvé.");
  }

  if (dryRun !== false) {
    return {
      ok: true,
      dryRun: true,
      writes: false,
      publicWrites: false,
      executionPlanFingerprint: writeIntent.executionPlanFingerprint,
      writeIntentFingerprint: writeIntent.writeIntentFingerprint,
      pagesPlanned: writeIntent.intents.length,
      pagesWritten: 0,
      rollbackSnapshots: 0,
      resultFingerprint: digest({ writeIntentFingerprint: writeIntent.writeIntentFingerprint, pagesPlanned: writeIntent.intents.length }),
    };
  }
  if (!explicitTrue(confirm)) {
    throw executorError("MSE_25_31_EXECUTOR_CONFIRMATION_REQUIRED", "L'exécution réelle MSE-25.31 exige confirm=true.");
  }

  const applied = [];
  try {
    for (const intent of writeIntent.intents) {
      const snapshot = await createRollbackSnapshot(service, intent, {
        ...metadata,
        reason: "mse-25.31:pre-apply-snapshot",
      });
      await service.save(
        intent.persistence.agencyId,
        intent.persistence.pageSlug,
        intent.persistence.body,
        {
          ...metadata,
          reason: "mse-25.31:quality-uplift-apply",
        }
      );
      applied.push({ intent, snapshot });
    }
  } catch (originalError) {
    const compensation = await compensate(service, applied, metadata);
    const code = compensation.failures.length > 0
      ? "MSE_25_31_EXECUTION_COMPENSATION_FAILED"
      : "MSE_25_31_EXECUTION_COMPENSATED";
    throw executorError(
      code,
      compensation.failures.length > 0
        ? "Le rollout MSE-25.31 a échoué et au moins une restauration automatique a également échoué."
        : "Le rollout MSE-25.31 a échoué ; les écritures déjà appliquées ont été restaurées automatiquement.",
      {
        originalError: {
          code: originalError.code || originalError.name || "EXECUTION_FAILED",
          message: originalError.message,
        },
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
  }));

  return {
    ok: true,
    dryRun: false,
    writes: true,
    publicWrites: true,
    versioned: true,
    rollbackReady: rollbackManifest.length === writeIntent.intents.length,
    executionPlanFingerprint: writeIntent.executionPlanFingerprint,
    writeIntentFingerprint: writeIntent.writeIntentFingerprint,
    pagesPlanned: writeIntent.intents.length,
    pagesWritten: applied.length,
    rollbackSnapshots: rollbackManifest.length,
    rollbackManifest,
    resultFingerprint: digest({ writeIntentFingerprint: writeIntent.writeIntentFingerprint, rollbackManifest }),
  };
}

module.exports = {
  compensate,
  createRollbackSnapshot,
  currentBody,
  digest,
  executeQualityUpliftWriteIntent,
  explicitTrue,
};
