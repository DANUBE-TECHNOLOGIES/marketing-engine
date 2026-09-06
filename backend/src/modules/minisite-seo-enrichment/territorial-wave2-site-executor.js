"use strict";

const {
  sha,
  buildPlan,
} = require(
  "./territorial-wave2-site-planner"
);

const CONFIRMATION =
  "APPLY-MSE-25.125AJ-WAVE2-SITE-BOIS-COLOMBES";

async function buildCurrentPlan({
  persistence,
}) {
  const source = {};

  for (const pageSlug of [
    "agence",
    "services",
    "destinations",
    "engagements",
  ]) {
    source[pageSlug] =
      await persistence.get({
        agencyId: 6,
        pageSlug,
      });
  }

  return buildPlan(source);
}

async function apply({
  persistence,
  confirmation,
}) {
  if (
    confirmation !== CONFIRMATION
  ) {
    const error = new Error(
      "AJ-D confirmation required"
    );

    error.code =
      "MSE_25_125AJ_CONFIRMATION_REQUIRED";

    throw error;
  }

  const plan =
    await buildCurrentPlan({
      persistence,
    });

  const rollbackManifest = [];

  for (const write of plan.writes) {
    if (!write.changed) {
      continue;
    }

    const current =
      await persistence.get({
        agencyId: 6,
        pageSlug:
          write.pageSlug,
      });

    const currentFingerprint =
      sha(current);

    if (
      currentFingerprint
      !== write.beforeFingerprint
    ) {
      const error = new Error(
        `AJ-D stale snapshot: ${write.pageSlug}`
      );

      error.code =
        "MSE_25_125AJ_STALE_SNAPSHOT";

      throw error;
    }

    rollbackManifest.push({
      pageSlug:
        write.pageSlug,
      snapshot:
        current,
      fingerprint:
        currentFingerprint,
    });
  }

  const applied = [];

  try {
    for (const write of plan.writes) {
      if (!write.changed) {
        continue;
      }

      const result =
        await persistence.save({
          agencyId: 6,
          pageSlug:
            write.pageSlug,
          body:
            write.body,
        });

      applied.push({
        pageSlug:
          write.pageSlug,
        result,
      });
    }
  } catch (error) {
    for (
      const rollback
      of rollbackManifest
        .slice()
        .reverse()
    ) {
      if (
        !applied.some(
          x =>
            x.pageSlug
            === rollback.pageSlug
        )
      ) {
        continue;
      }

      await persistence.save({
        agencyId: 6,
        pageSlug:
          rollback.pageSlug,
        body:
          rollback.snapshot,
      });
    }

    throw error;
  }

  return {
    operation:
      "territorial-wave2-site-applied",

    providerCalls: 0,
    externalCalls: 0,

    applied,

    rollbackManifest:
      rollbackManifest.map(
        x => ({
          pageSlug:
            x.pageSlug,
          fingerprint:
            x.fingerprint,
        })
      ),

    siteActionIds:
      plan.siteActionIds,

    operationalActionIds:
      plan.operationalActionIds,
  };
}

module.exports = {
  CONFIRMATION,
  buildCurrentPlan,
  apply,
};
