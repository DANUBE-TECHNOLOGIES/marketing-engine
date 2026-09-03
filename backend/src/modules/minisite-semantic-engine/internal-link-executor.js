"use strict";

const crypto = require("node:crypto");
const { saveBody } = require("../minisite-seo-enrichment/quality-uplift-write-intent");

function stable(value) { if (Array.isArray(value)) return value.map(stable); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])); }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function explicitTrue(value) { return value === true || String(value || "").trim().toLowerCase() === "true"; }
function error(code, message, details = {}) { const e = new Error(message); e.code = code; e.status = 409; e.details = details; return e; }

function assertWriteIntent(intent = {}, approved) {
  if (intent.version !== "mse-25.47" || intent.operation !== "internal-link-write-intent" || intent.readOnly !== true || intent.writes !== false || intent.publicWrites !== false || !Array.isArray(intent.intents)) throw error("MSE_25_47_LINK_EXECUTOR_INTENT_INVALID", "Write-intent MSE-25.47 invalide.");
  const expected = String(approved || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) throw error("MSE_25_47_LINK_EXECUTOR_FINGERPRINT_REQUIRED", "Fingerprint approuvé requis.");
  if (expected !== String(intent.writeIntentFingerprint || "").toLowerCase()) throw error("MSE_25_47_LINK_EXECUTOR_FINGERPRINT_MISMATCH", "Fingerprint approuvé différent du write-intent.");
}

async function executeInternalLinkWriteIntent({ writeIntent = {}, service, dryRun = true, confirm = false, approvedWriteIntentFingerprint, metadata = {} } = {}) {
  assertWriteIntent(writeIntent, approvedWriteIntentFingerprint);
  if (dryRun !== false) return { ok: true, dryRun: true, writes: false, publicWrites: false, pagesPlanned: writeIntent.intents.length, pagesWritten: 0, rollbackSnapshots: 0, writeIntentFingerprint: writeIntent.writeIntentFingerprint };
  if (!explicitTrue(confirm)) throw error("MSE_25_47_LINK_EXECUTOR_CONFIRM_REQUIRED", "confirm=true est requis pour l'écriture réelle.");
  const applied = [];
  try {
    for (const intent of writeIntent.intents) {
      const current = await service.get(intent.agencyId, intent.pageSlug);
      const actual = digest(saveBody(current));
      if (actual !== intent.sourceSnapshotFingerprint) throw error("MSE_25_47_LINK_EXECUTOR_SOURCE_CHANGED", "La page source a changé depuis le write-intent.", { siteSlug: intent.siteSlug, pageSlug: intent.pageSlug, expected: intent.sourceSnapshotFingerprint, actual });
      await service.save(intent.agencyId, intent.pageSlug, intent.snapshot.before, { ...metadata, reason: "mse-25.47:pre-apply-snapshot" });
      const versions = await service.versions(intent.agencyId, intent.pageSlug);
      const latest = versions?.items?.[0];
      if (!latest?.id) throw error("MSE_25_47_LINK_ROLLBACK_SNAPSHOT_MISSING", "Snapshot de rollback introuvable.");
      await service.save(intent.agencyId, intent.pageSlug, intent.persistence.body, { ...metadata, reason: "mse-25.47:internal-link-apply" });
      applied.push({ intent, snapshot: latest });
    }
  } catch (cause) {
    for (const row of [...applied].reverse()) {
      try { await service.rollback(row.intent.agencyId, row.intent.pageSlug, row.snapshot.id, { ...metadata, reason: "mse-25.47:automatic-compensation" }); } catch (_) {}
    }
    throw cause;
  }
  const rollbackManifest = applied.map(({ intent, snapshot }) => ({ agencyId: intent.agencyId, siteSlug: intent.siteSlug, pageSlug: intent.pageSlug, rollbackVersionId: snapshot.id, rollbackVersion: snapshot.version ?? null, sourceSnapshotFingerprint: intent.sourceSnapshotFingerprint, targetSnapshotFingerprint: intent.targetSnapshotFingerprint }));
  return { ok: true, dryRun: false, writes: true, publicWrites: true, versioned: true, rollbackReady: rollbackManifest.length === writeIntent.intents.length, pagesPlanned: writeIntent.intents.length, pagesWritten: applied.length, rollbackSnapshots: rollbackManifest.length, rollbackManifest, writeIntentFingerprint: writeIntent.writeIntentFingerprint, resultFingerprint: digest({ writeIntentFingerprint: writeIntent.writeIntentFingerprint, rollbackManifest }) };
}

module.exports = { assertWriteIntent, digest, executeInternalLinkWriteIntent };
