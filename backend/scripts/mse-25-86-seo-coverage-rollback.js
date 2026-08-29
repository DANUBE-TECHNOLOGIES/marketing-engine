"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

function explicitTrue(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function loadReport(reportPath) {
  const resolved = path.resolve(String(reportPath || "").trim());
  if (!resolved || !fs.existsSync(resolved)) {
    const error = new Error("Rapport MSE-25.86 introuvable.");
    error.code = "MSE_25_86_ROLLBACK_REPORT_NOT_FOUND";
    throw error;
  }
  const report = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (report?.type !== "mse-25.86-seo-coverage-remediation" || !Array.isArray(report?.rollbackSnapshots)) {
    const error = new Error("Rapport MSE-25.86 invalide ou sans snapshots de rollback.");
    error.code = "MSE_25_86_ROLLBACK_REPORT_INVALID";
    throw error;
  }
  if (report?.writes !== true || report?.dryRun === true) {
    const error = new Error("Le rapport fourni ne correspond pas à une écriture réelle MSE-25.86.");
    error.code = "MSE_25_86_ROLLBACK_REPORT_NOT_APPLIED";
    throw error;
  }
  return { resolved, report };
}

async function rollbackSnapshots(tx, snapshots, { dryRun = true } = {}) {
  const reversed = [...(snapshots || [])].reverse();
  const restored = [];

  for (const snapshot of reversed) {
    if (snapshot?.type === "block") {
      if (!snapshot.id || !snapshot.content || typeof snapshot.content !== "object") continue;
      if (!dryRun) {
        await tx.pageBlock.update({
          where: { id: snapshot.id },
          data: { content: snapshot.content },
        });
      }
      restored.push({ type: "block", id: snapshot.id, pageId: snapshot.pageId || null });
      continue;
    }

    if (snapshot?.type === "page") {
      if (!snapshot.id) continue;
      if (!dryRun) {
        await tx.agencySitePage.update({
          where: { id: snapshot.id },
          data: {
            seoTitle: snapshot.seoTitle ?? null,
            metaDescription: snapshot.metaDescription ?? null,
          },
        });
      }
      restored.push({ type: "page", id: snapshot.id, slug: snapshot.slug || null });
    }
  }

  return restored;
}

async function run({
  reportPath = process.env.MSE_25_86_ROLLBACK_REPORT,
  dryRun = !explicitTrue(process.env.MSE_25_86_ROLLBACK_CONFIRM),
} = {}) {
  const { resolved, report } = loadReport(reportPath);
  const prisma = new PrismaClient();
  try {
    const restored = await prisma.$transaction((tx) =>
      rollbackSnapshots(tx, report.rollbackSnapshots, { dryRun })
    );
    const output = {
      ok: true,
      dryRun,
      writes: !dryRun,
      reportPath: resolved,
      restored: restored.length,
      frontendFilesTouched: 0,
      structuralBlocksCreated: 0,
      structuralBlocksDeleted: 0,
    };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_86_ROLLBACK_FAILED",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  explicitTrue,
  loadReport,
  rollbackSnapshots,
  run,
};
