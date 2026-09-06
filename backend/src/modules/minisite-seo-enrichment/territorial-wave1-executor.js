"use strict";

const crypto = require("node:crypto");

const {
  buildTerritorialWave1Preview,
} = require("./territorial-wave1-planner");

const {
  validatedSaveBody,
} = require("./quality-uplift-write-intent");

const VERSION = "mse-25.125ai-wave1-apply-v1";
const CONFIRMATION = "APPLY-MSE-25.125AI-WAVE1-BOIS-COLOMBES";

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value ?? ""), "utf8")
    .digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function executionFingerprint(preview) {
  return sha256(
    JSON.stringify({
      version: VERSION,
      agencyId: preview.agencyId,
      campaignId: preview.campaignId,
      siteSlug: preview.siteSlug,
      pageIntents: preview.pageIntents.map((page) => ({
        pageId: page.pageId,
        pageSlug: page.pageSlug,
        beforeSnapshotFingerprint:
          page.beforeSnapshotFingerprint,
        afterSnapshotFingerprint:
          page.afterSnapshotFingerprint,
        touchedBlockIds:
          page.touchedBlockIds,
        effects:
          page.effects,
      })),
    })
  );
}

function buildSaveBody(pageIntent) {
  return validatedSaveBody(
    clone(pageIntent.after)
  );
}

async function buildApplyPlan({
  site,
  campaignId = 11,
} = {}) {
  const preview =
    buildTerritorialWave1Preview({
      site,
      campaignId,
    });

  if (
    preview.writes !== false ||
    preview.publicWrites !== false ||
    preview.providerCalls !== 0 ||
    preview.externalCalls !== 0
  ) {
    const error =
      new Error("Unsafe Wave1 preview.");
    error.code =
      "MSE_25_125AI_UNSAFE_PREVIEW";
    throw error;
  }

  if (
    preview.summary.pageWriteCount !== 4 ||
    preview.summary.semanticEffectCount !== 8 ||
    preview.summary.touchedBlockCount !== 5
  ) {
    const error =
      new Error("Unexpected Wave1 scope.");
    error.code =
      "MSE_25_125AI_SCOPE_CHANGED";
    throw error;
  }

  const intents =
    preview.pageIntents.map((page) => ({
      pageId:
        page.pageId,

      pageSlug:
        page.pageSlug,

      sourceFingerprint:
        page.beforeSnapshotFingerprint,

      finalFingerprint:
        page.afterSnapshotFingerprint,

      touchedBlockIds:
        [...page.touchedBlockIds],

      effects:
        clone(page.effects),

      rollbackSnapshot:
        clone(page.before),

      finalSnapshot:
        clone(page.after),

      saveBody:
        buildSaveBody(page),
    }));

  return {
    version:
      VERSION,

    operation:
      "territorial-wave1-apply-plan",

    readOnly:
      true,

    writes:
      false,

    publicWrites:
      false,

    persistenceCallsPerformed:
      0,

    agencyId:
      6,

    campaignId:
      11,

    siteSlug:
      preview.siteSlug,

    confirmationRequired:
      CONFIRMATION,

    executionFingerprint:
      executionFingerprint(preview),

    summary: {
      pageWriteCount:
        intents.length,
      semanticEffectCount:
        8,
      touchedBlockCount:
        5,
    },

    intents,
  };
}

async function executeWave1({
  site,
  persistence,
  campaignId = 11,
  confirmation,
  expectedFingerprint,
  dryRun = true,
} = {}) {
  const plan =
    await buildApplyPlan({
      site,
      campaignId,
    });

  if (dryRun) {
    return {
      ...plan,
      operation:
        "territorial-wave1-apply-dry-run",
      dryRun: true,
    };
  }

  if (confirmation !== CONFIRMATION) {
    const error =
      new Error("Explicit confirmation required.");
    error.code =
      "MSE_25_125AI_CONFIRMATION_REQUIRED";
    throw error;
  }

  if (
    !expectedFingerprint ||
    expectedFingerprint !==
      plan.executionFingerprint
  ) {
    const error =
      new Error("Execution fingerprint mismatch.");
    error.code =
      "MSE_25_125AI_FINGERPRINT_MISMATCH";
    throw error;
  }

  if (
    !persistence ||
    typeof persistence.get !== "function" ||
    typeof persistence.save !== "function"
  ) {
    const error =
      new Error("Persistence contract unavailable.");
    error.code =
      "MSE_25_125AI_PERSISTENCE_UNAVAILABLE";
    throw error;
  }

  /*
   * Re-read every page before the FIRST write.
   * If a single persisted page has moved, nothing is written.
   */
  for (const intent of plan.intents) {
    const live =
      await persistence.get({
        agencyId:
          6,
        pageSlug:
          intent.pageSlug,
      });

    const liveFingerprint =
      sha256(JSON.stringify(live));

    if (
      liveFingerprint !==
      intent.sourceFingerprint
    ) {
      const error =
        new Error(
          `Stale persisted page: ${intent.pageSlug}`
        );
      error.code =
        "MSE_25_125AI_STALE_PAGE";
      throw error;
    }
  }

  const applied = [];
  const rollback = [];

  try {
    for (const intent of plan.intents) {
      const saved =
        await persistence.save({
          agencyId:
            6,
          pageSlug:
            intent.pageSlug,
          body:
            intent.saveBody,
          metadata: {
            reason:
              VERSION,
            createdBy:
              "mse-25.125ai",
          },
        });

      applied.push({
        pageId:
          intent.pageId,
        pageSlug:
          intent.pageSlug,
        saved,
      });
    }
  } catch (writeError) {
    /*
     * Automatic compensation in reverse order.
     */
    const failures = [];

    for (
      const intent of [...plan.intents]
        .filter((candidate) =>
          applied.some(
            (row) =>
              row.pageId === candidate.pageId
          )
        )
        .reverse()
    ) {
      try {
        const rollbackBody =
          validatedSaveBody(
            clone(intent.rollbackSnapshot)
          );

        await persistence.save({
          agencyId:
            6,
          pageSlug:
            intent.pageSlug,
          body:
            rollbackBody,
          metadata: {
            reason:
              `${VERSION}:automatic-rollback`,
            createdBy:
              "mse-25.125ai",
          },
        });

        rollback.push({
          pageId:
            intent.pageId,
          pageSlug:
            intent.pageSlug,
          status:
            "rolled-back",
        });
      } catch (rollbackError) {
        failures.push({
          pageId:
            intent.pageId,
          pageSlug:
            intent.pageSlug,
          message:
            rollbackError.message,
        });
      }
    }

    const error =
      new Error(
        failures.length
          ? "Wave1 write failed and rollback was incomplete."
          : "Wave1 write failed; applied pages were rolled back."
      );

    error.code =
      failures.length
        ? "MSE_25_125AI_ROLLBACK_INCOMPLETE"
        : "MSE_25_125AI_WRITE_ROLLED_BACK";

    error.cause =
      writeError;

    error.rollback =
      rollback;

    error.rollbackFailures =
      failures;

    throw error;
  }

  return {
    version:
      VERSION,

    operation:
      "territorial-wave1-applied",

    dryRun:
      false,

    writes:
      true,

    agencyId:
      6,

    campaignId:
      11,

    executionFingerprint:
      plan.executionFingerprint,

    summary: {
      pageWriteCount:
        applied.length,
      semanticEffectCount:
        8,
      touchedBlockCount:
        5,
    },

    applied,

    rollbackManifest:
      plan.intents.map((intent) => ({
        pageId:
          intent.pageId,
        pageSlug:
          intent.pageSlug,
        sourceFingerprint:
          intent.sourceFingerprint,
        rollbackSnapshot:
          intent.rollbackSnapshot,
      })),
  };
}

module.exports = {
  VERSION,
  CONFIRMATION,
  buildApplyPlan,
  executeWave1,
  executionFingerprint,
};
