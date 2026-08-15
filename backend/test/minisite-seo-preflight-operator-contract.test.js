"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const preflightSource = fs.readFileSync(
  path.join(__dirname, "../scripts/mse-25-30-preflight.js"),
  "utf8"
);
const previewSource = fs.readFileSync(
  path.join(__dirname, "../scripts/mse-25-30-network-preview.js"),
  "utf8"
);

test("MSE-25.30 preflight archives reports outside the repository by default", () => {
  assert.match(preflightSource, /os\.homedir\(\)/);
  assert.match(preflightSource, /mse-25-30-reports/);
  assert.match(preflightSource, /fs\.mkdirSync\(directory, \{ recursive: true \}\)/);
});

test("MSE-25.30 preflight invokes network preview without CLI side effects", () => {
  assert.match(preflightSource, /emitOutput:\s*false/);
  assert.match(preflightSource, /setExitCode:\s*false/);
  assert.match(previewSource, /emitOutput = true/);
  assert.match(previewSource, /setExitCode = true/);
  assert.match(previewSource, /if \(emitOutput\) console\.log/);
  assert.match(previewSource, /if \(setExitCode && result\.rolloutBlocked\) process\.exitCode = 2/);
});
