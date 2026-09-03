"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { certify } = require("../scripts/mse-25-52-certify");

function safe(overrides = {}) {
  return {
    readOnly: true,
    writes: false,
    publicWrites: false,
    summary: { executableCount: 0, automaticWriteCount: 0 },
    policy: { rankingIsAdvisoryOnly: true, humanReviewRequired: true, automaticWrites: false },
    items: [{ key: "x", reviewOnly: true, executable: false, automaticWrite: false }],
    ...overrides,
  };
}

test("advisory-only prioritization certifies", () => assert.equal(certify(safe()).certified, true));
test("executable item fails certification", () => assert.equal(certify(safe({ items: [{ key: "x", reviewOnly: true, executable: true, automaticWrite: false }] })).certified, false));
test("automatic writes fail certification", () => assert.equal(certify(safe({ summary: { executableCount: 0, automaticWriteCount: 1 } })).certified, false));
test("human review remains mandatory", () => assert.equal(certify(safe({ policy: { rankingIsAdvisoryOnly: true, humanReviewRequired: false, automaticWrites: false } })).certified, false));
