"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("Google Business photo module exports routes", () => {
  const definition = require("../src/modules/google-business-photos");
  assert.equal(typeof definition.routes, "function");
});
