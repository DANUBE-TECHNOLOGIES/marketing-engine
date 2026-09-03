#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const {
  TARGETS,
  buildTargetPlan,
  projectionForPlan,
  loadSites,
} = require("./mse-25-86-seo-coverage-remediation");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function readApplyReport(file) {
  const resolved = path.resolve(String(file || "").trim());
  if (!resolved || !fs.existsSync(resolved)) {
    const error = new Error(`Rapport d'application MSE-25.86 introuvable: ${file || "null"}`);
    error.code = "MSE_25_86_POST_APPLY_REPORT_MISSING";
    throw error;
  }
  const report = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (report?.type !== "mse-25.86-seo-coverage-remediation" || report?.writes !== true || report?.dryRun === true) {
    const error = new Error("Le rapport fourni n'est pas un rapport d'application réelle MSE-25.86.");
    error.code = "MSE_25_86_POST_APPLY_REPORT_INVALID";
    throw error;
  }
  if (!Array.isArray(report?.projections) || report?.allProjectedRequiredIntentsStrong !== true) {
    const error = new Error("Le rapport d'application ne contient pas une projection SEO certifiée.");
    error.code = "MSE_25_86_POST_APPLY_PROJECTION_REQUIRED";
    throw error;
  }
  return { resolved, report };
}

function verifyPersistedPlan(plan, expectedProjection) {
  const persisted = projectionForPlan(plan);
  const target = plan.target;
  const intentChecks = persisted.requiredIntents.map((key) => {
    const expected = expectedProjection?.after?.[key] || null;
    const actual = persisted?.before?.[key] || null;
    return {
      intent: key,
      expected,
      actual,
      statusStrong: actual?.status === "strong",
      scoreMatchesProjection: Boolean(expected && actual && expected.score === actual.score && expected.status === actual.status),
    };
  });
  const intentsVerified = intentChecks.every((item) => item.statusStrong && item.scoreMatchesProjection);
  const localContextVerified = !target.localContext || persisted.localContextBefore === true;
  return {
    city: target.city,
    intentsVerified,
    localContextVerified,
    verified: intentsVerified && localContextVerified,
    intentChecks,
    localContextPersisted: persisted.localContextBefore,
  };
}

function writeImmutable(file, payload) {
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(payload, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

async function run({
  prisma,
  applyReportPath = process.env.MSE_25_86_APPLY_REPORT,
  tenantSlug = process.env.TENANT_SLUG || "mondescale",
  reportDir = process.env.MSE_25_86_REPORT_DIR || "/home/admin1/mse-25-86-reports",
  emitOutput = true,
} = {}) {
  const { resolved, report: applyReport } = readApplyReport(applyReportPath);
  const ownPrisma = !prisma;
  const db = prisma || new PrismaClient();
  try {
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant?.id) {
      const error = new Error(`Tenant ${tenantSlug} introuvable.`);
      error.code = "MSE_25_86_POST_APPLY_TENANT_NOT_FOUND";
      throw error;
    }
    const sites = await loadSites(db, tenant.id);
    const plans = TARGETS.map((target) => buildTargetPlan(sites, target));
    const verifications = plans.map((plan) => {
      const expectedProjection = applyReport.projections.find((item) => item.city === plan.target.city);
      if (!expectedProjection) {
        const error = new Error(`Projection d'application absente pour ${plan.target.city}.`);
        error.code = "MSE_25_86_POST_APPLY_CITY_PROJECTION_MISSING";
        throw error;
      }
      return verifyPersistedPlan(plan, expectedProjection);
    });
    const verified = verifications.every((item) => item.verified);
    const verificationReport = {
      type: "MSE_25_86_POST_APPLY_VERIFICATION_REPORT",
      generatedAt: new Date().toISOString(),
      certified: verified,
      readOnly: true,
      writes: false,
      publicWrites: false,
      sourceApplyReportPath: resolved,
      sourceApplyReportFingerprint: fingerprint(applyReport),
      verifiedSites: verifications.filter((item) => item.verified).length,
      targetSites: TARGETS.length,
      verifications,
      summary: {
        verified,
        rollbackReviewRequired: !verified,
        executableCount: 0,
        automaticWriteCount: 0,
        pageCreationCount: 0,
        publicationCount: 0,
        frontendMutationCount: 0,
      },
      policy: {
        postApplyVerificationReadOnly: true,
        automaticRollbackForbidden: true,
        rollbackRequiresSeparateHumanDecision: true,
        rollbackMustUsePersistedSnapshot: true,
      },
    };
    verificationReport.reportFingerprint = fingerprint(verificationReport);
    fs.mkdirSync(reportDir, { recursive: true });
    const file = path.join(reportDir, `mse-25-86-post-apply-verification-${verificationReport.reportFingerprint.slice(0,12)}.json`);
    writeImmutable(file, verificationReport);
    const output = { ok: verified, reportPath: file, ...verificationReport };
    if (emitOutput) console.log(JSON.stringify(output, null, 2));
    if (!verified) {
      const error = new Error("La vérification post-apply MSE-25.86 a détecté un écart entre projection et données persistées.");
      error.code = "MSE_25_86_POST_APPLY_VERIFY_FAILED";
      error.details = output;
      throw error;
    }
    return output;
  } finally {
    if (ownPrisma) await db.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      certified: false,
      readOnly: true,
      writes: false,
      publicWrites: false,
      error: error.code || "MSE_25_86_POST_APPLY_VERIFY_FAILED",
      message: error.message,
      details: error.details || null,
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  stable,
  fingerprint,
  readApplyReport,
  verifyPersistedPlan,
  writeImmutable,
  run,
};