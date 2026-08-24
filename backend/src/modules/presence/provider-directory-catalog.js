"use strict";

const { directoryNameForProviderKey } = require("./directory-bridge");

const DIRECTORY_DEFAULTS = Object.freeze({
  here: Object.freeze({ category: "map", impactScore: 7, difficulty: 3, priority: 70, submissionMode: "submission_api" }),
  tripadvisor: Object.freeze({ category: "directory", impactScore: 7, difficulty: 2, priority: 75, submissionMode: "manual" }),
  petit_fute: Object.freeze({ category: "directory", impactScore: 5, difficulty: 3, priority: 60, submissionMode: "manual" })
});

function directoryDefaultsForProvider(providerKey) {
  const name = directoryNameForProviderKey(providerKey);
  const defaults = DIRECTORY_DEFAULTS[providerKey] || null;
  return name && defaults ? Object.freeze({ name, ...defaults }) : null;
}

module.exports = { DIRECTORY_DEFAULTS, directoryDefaultsForProvider };
