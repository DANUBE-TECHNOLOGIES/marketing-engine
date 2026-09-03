const test = require("node:test");
const assert = require("node:assert/strict");
const { certify } = require("../scripts/mse-25-51-certify");

function queue(overrides = {}) {
  return {
    readOnly: true,
    writes: false,
    queueFingerprint: "queue",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    items: [],
    policy: { humanReviewRequired: true, automaticWrites: false, pageCreation: false, websiteDesignerMutation: false, publication: false },
    ...overrides,
  };
}

test("safe empty queue certifies", () => {
  const result = certify({ queue: queue(), reportDir: require("node:os").tmpdir(), emitOutput: false });
  assert.equal(result.certified, true);
  assert.deepEqual(result.violations, []);
});

test("executable queue fails closed", () => {
  const result = certify({ queue: queue({ summary: { executableCount: 1, automaticWriteCount: 0 } }), reportDir: require("node:os").tmpdir(), emitOutput: false });
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("EXECUTABLE_ITEMS_PRESENT"));
});

test("automatic write count fails closed", () => {
  const result = certify({ queue: queue({ summary: { executableCount: 0, automaticWriteCount: 1 } }), reportDir: require("node:os").tmpdir(), emitOutput: false });
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("AUTOMATIC_WRITES_PRESENT"));
});

test("unsafe item fails closed", () => {
  const result = certify({ queue: queue({ items: [{ key: "unsafe", reviewOnly: false, executable: true, automaticWrite: true }] }), reportDir: require("node:os").tmpdir(), emitOutput: false });
  assert.equal(result.certified, false);
  assert.ok(result.violations.some((value) => value.startsWith("UNSAFE_ITEM:")));
});
