#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildInternalLinkWriteIntent } = require("../src/modules/minisite-semantic-engine/internal-link-write-intent");
const { fetchCurrentPagesDirect } = require("./mse-25-40-write-intent");

function load(file) { return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")); }

async function run() {
  const proofPath = process.env.MSE_25_47_LINK_PROOF;
  if (!proofPath) throw Object.assign(new Error("MSE_25_47_LINK_PROOF requis."), { code: "MSE_25_47_LINK_PROOF_REQUIRED" });
  const proof = load(proofPath);
  const syntheticPlan = { sites: proof.items.map((item) => ({ siteSlug: item.siteSlug, agencyId: item.agencyId, executablePages: [{ siteSlug: item.siteSlug, agencyId: item.agencyId, pageSlug: item.sourcePageSlug }] })) };
  const currentPages = await fetchCurrentPagesDirect(syntheticPlan, { tenantSlug: process.env.TENANT_SLUG || "mondescale", envFile: process.env.MSE_25_40_ENV_FILE });
  const report = buildInternalLinkWriteIntent({ proof, currentPages });
  const reportDir = process.env.MSE_25_47_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-47-internal-link-write-intent-${report.writeIntentFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, publicWrites: false, reportPath, writeIntentFingerprint: report.writeIntentFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => { console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_LINK_WRITE_INTENT_FAILED", message: error.message }, null, 2)); process.exitCode = 1; });

module.exports = { run };
