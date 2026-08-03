"use strict";

const fs = require("node:fs");
const path = require("node:path");

function stateFile(root) {
  return path.join(root, "patches", ".state.json");
}

function readState(root) {
  const file = stateFile(root);
  if (!fs.existsSync(file)) return { installed: [], lastRun: null };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeState(root, state) {
  const file = stateFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

function markInstalled(root, patch) {
  const state = readState(root);
  const installed = state.installed.filter((item) => item.id !== patch.id);
  installed.push({
    id: patch.id,
    version: patch.version,
    title: patch.title,
    installedAt: new Date().toISOString(),
  });
  writeState(root, {
    installed,
    lastRun: {
      id: patch.id,
      version: patch.version,
      status: "success",
      finishedAt: new Date().toISOString(),
    },
  });
}

function markFailed(root, patch, error) {
  const state = readState(root);
  writeState(root, {
    ...state,
    lastRun: {
      id: patch.id,
      version: patch.version,
      status: "failed",
      error: error.message,
      finishedAt: new Date().toISOString(),
    },
  });
}

module.exports = { readState, writeState, markInstalled, markFailed };
