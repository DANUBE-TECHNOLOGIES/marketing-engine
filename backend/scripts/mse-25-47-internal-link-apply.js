#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { persistenceServiceForTenant } = require("./mse-25-40-network-apply");
const { executeInternalLinkWriteIntent } = require("../src/modules/minisite-semantic-engine/internal-link-executor");

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function load(file) { if (!file) throw Object.assign(new Error("Write-intent MSE-25.47 requis."), { code: "MSE_25_47_LINK_APPLY_INTENT_REQUIRED" }); return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")); }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }

async function run({ dryRun = true } = {}) {
  const writeIntentPath = process.env.MSE_25_47_LINK_WRITE_INTENT;
  const writeIntent = load(writeIntentPath);
  const approved = process.env.MSE_25_47_APPROVED_WRITE_INTENT_FINGERPRINT;
  const confirm = process.env.MSE_25_47_CONFIRM;
  const tenantSlug = process.env.TENANT_SLUG || "mondescale";
  let persistence = { service: { get: async()=>({}), save: async()=>({}), versions: async()=>({items:[]}), rollback: async()=>({}) }, prisma: null, ownsPrisma: false, tenantId: null };
  if (dryRun === false) persistence = await persistenceServiceForTenant(tenantSlug, { envFile: process.env.MSE_25_40_ENV_FILE });
  try {
    const result = await executeInternalLinkWriteIntent({ writeIntent, service: persistence.service, dryRun, confirm, approvedWriteIntentFingerprint: approved, metadata: { createdBy: process.env.CREATED_BY || "mse-25.47-network-rollout", tenantId: persistence.tenantId || null } });
    const report = { type: "mse-25.47-internal-link-rollout-report", generatedAt: new Date().toISOString(), context: { tenantSlug, tenantId: persistence.tenantId || null }, proof: { writeIntentPath: path.resolve(writeIntentPath), linkProofFingerprint: writeIntent.linkProofFingerprint, writeIntentFingerprint: writeIntent.writeIntentFingerprint }, result, rollbackManifest: result.rollbackManifest || [] };
    report.reportFingerprint = digest(report);
    const dir = process.env.MSE_25_47_REPORT_DIR || "/tmp"; fs.mkdirSync(dir, { recursive: true });
    const reportPath = path.join(dir, `mse-25-47-internal-link-rollout-${timestamp()}.json`); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ok: result.ok, dryRun: result.dryRun, writes: result.writes, publicWrites: result.publicWrites, pagesWritten: result.pagesWritten || 0, rollbackSnapshots: result.rollbackSnapshots || 0, writeIntentFingerprint: writeIntent.writeIntentFingerprint, reportFingerprint: report.reportFingerprint, reportPath }, null, 2));
    return report;
  } finally { if (persistence.ownsPrisma && persistence.prisma) await persistence.prisma.$disconnect(); }
}

if (require.main === module) run({ dryRun: String(process.env.MSE_25_47_DRY_RUN || "true").toLowerCase() !== "false" }).catch((error) => { console.error(JSON.stringify({ ok:false, error:error.code || "MSE_25_47_LINK_APPLY_FAILED", message:error.message, details:error.details || {} }, null, 2)); process.exitCode=1; });
module.exports = { run };
