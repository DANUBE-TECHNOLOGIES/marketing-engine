"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildPostRollbackRuntimeStatus } = require("../src/modules/minisite-semantic-engine/post-rollback-runtime-status");

function writeJson(dir, name, payload) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, `${JSON.stringify(payload)}\n`, "utf8");
  return file;
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "post-rollback-runtime-"));
  const rollbackDir = path.join(root, "rollback");
  const verificationDir = path.join(root, "verification");
  return {
    root,
    rollbackDir,
    verificationDir,
    env: {
      MSE_25_67_REPORT_DIR: rollbackDir,
      MSE_25_68_REPORT_DIR: verificationDir,
    },
  };
}

function certifiedRollback(f, name = "mse-25-67-guarded-rollback-a.json", fingerprint = "rollback-fp-a") {
  return writeJson(f.rollbackDir, name, {
    audit: {
      type: "MSE_25_67_GUARDED_ROLLBACK_AUDIT",
      transactional: true,
      automaticRollback: false,
      pageCreated: false,
      published: false,
      auditFingerprint: fingerprint,
      pageIdentity: "page-1",
      siteSlug: "gien",
      page: "/",
    },
  });
}

function certifiedVerification(f, rollbackPath, rollbackFingerprint = "rollback-fp-a") {
  return writeJson(f.verificationDir, "mse-25-68-post-rollback-verification-a.json", {
    type: "MSE_25_68_POST_ROLLBACK_VERIFICATION_REPORT",
    generatedAt: "2026-08-26T10:00:00.000Z",
    certified: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourceRollbackReportPath: rollbackPath,
    verification: {
      incidentRecovered: true,
      manualInterventionRequired: false,
      verificationFingerprint: "abc123",
      sourceRollbackAuditFingerprint: rollbackFingerprint,
    },
    certification: { certified: true, reasons: [] },
  });
}

test("waits without a certified guarded rollback audit", () => {
  const f = fixture();
  try {
    const status = buildPostRollbackRuntimeStatus({ env: f.env });
    assert.equal(status.status, "waiting");
    assert.equal(status.state, "WAITING_FOR_GUARDED_ROLLBACK_AUDIT");
    assert.equal(status.readOnly, true);
    assert.equal(status.writes, false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("requests verification once guarded rollback is certified", () => {
  const f = fixture();
  try {
    certifiedRollback(f);
    const status = buildPostRollbackRuntimeStatus({ env: f.env });
    assert.equal(status.status, "attention");
    assert.equal(status.rollback.certified, true);
    assert.equal(status.verification.certified, false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("reports healthy only with a certified read-only verification bound to the exact rollback", () => {
  const f = fixture();
  try {
    const rollbackPath = certifiedRollback(f);
    certifiedVerification(f, rollbackPath);
    const status = buildPostRollbackRuntimeStatus({ env: f.env });
    assert.equal(status.status, "healthy");
    assert.equal(status.state, "POST_ROLLBACK_VERIFIED");
    assert.equal(status.verification.certified, true);
    assert.equal(status.verification.provenanceMatches, true);
    assert.equal(status.invariants.automaticWriteCount, 0);
    assert.equal(status.invariants.publicationCount, 0);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("never reuses a stale verification from another rollback", () => {
  const f = fixture();
  try {
    certifiedRollback(f, "mse-25-67-guarded-rollback-a.json", "rollback-fp-new");
    const oldRollbackPath = path.join(f.rollbackDir, "mse-25-67-guarded-rollback-old.json");
    certifiedVerification(f, oldRollbackPath, "rollback-fp-old");
    const status = buildPostRollbackRuntimeStatus({ env: f.env });
    assert.equal(status.status, "attention");
    assert.equal(status.state, "POST_ROLLBACK_VERIFICATION_PROVENANCE_MISMATCH");
    assert.equal(status.verification.certified, false);
    assert.equal(status.verification.provenanceMatches, false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
