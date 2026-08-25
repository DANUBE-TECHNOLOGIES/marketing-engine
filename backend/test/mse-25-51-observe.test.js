const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-51-observe");

function queueResult(overrides = {}) {
  return {
    ok: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    queueFingerprint: "queue-1",
    reportPath: "/tmp/queue.json",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    summary: { reviewItemCount: 1, executableCount: 0, automaticWriteCount: 0 },
    policy: { humanReviewRequired: true, automaticWrites: false, pageCreation: false, websiteDesignerMutation: false, publication: false },
    items: [{ key: "gien|ticketing", reviewOnly: true, executable: false, automaticWrite: false }],
    ...overrides,
  };
}

test("end-to-end observation remains read-only and certified", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-51-observe-"));
  const old = process.env.MSE_25_51_REPORT_DIR;
  process.env.MSE_25_51_REPORT_DIR = dir;
  try {
    const result = await run({
      queueRunner: async () => queueResult(),
      certifier: ({ queue }) => ({ certified: true, certificationFingerprint: "cert-1", reportPath: path.join(dir, "cert.json") }),
      emitOutput: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.readOnly, true);
    assert.equal(result.writes, false);
    assert.equal(result.reviewItemCount, 1);
    assert.equal(result.executableCount, 0);
    assert.equal(result.automaticWriteCount, 0);
    assert.equal(fs.existsSync(result.reportPath), true);
  } finally {
    if (old === undefined) delete process.env.MSE_25_51_REPORT_DIR; else process.env.MSE_25_51_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("empty queue is valid while Search Console has no persistent review signal", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-51-empty-"));
  const old = process.env.MSE_25_51_REPORT_DIR;
  process.env.MSE_25_51_REPORT_DIR = dir;
  try {
    const result = await run({
      queueRunner: async () => queueResult({ dataState: "NO_DATA_YET", lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA", summary: { reviewItemCount: 0, executableCount: 0, automaticWriteCount: 0 }, items: [] }),
      certifier: () => ({ certified: true, certificationFingerprint: "cert-empty", reportPath: path.join(dir, "cert.json") }),
      emitOutput: false,
    });
    assert.equal(result.certified, true);
    assert.equal(result.reviewItemCount, 0);
    assert.equal(result.executableCount, 0);
  } finally {
    if (old === undefined) delete process.env.MSE_25_51_REPORT_DIR; else process.env.MSE_25_51_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
