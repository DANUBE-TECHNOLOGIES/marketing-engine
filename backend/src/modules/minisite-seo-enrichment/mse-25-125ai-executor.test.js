"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CONFIRMATION,
} = require("./territorial-wave1-executor");

test(
  "AI-D confirmation is explicit and campaign-specific",
  () => {
    assert.equal(
      CONFIRMATION,
      "APPLY-MSE-25.125AI-WAVE1-BOIS-COLOMBES"
    );
  }
);
