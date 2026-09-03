"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_GITHUB_API_ORIGIN,
  baselineWorkflowRunsUrl,
} = require("../scripts/mse-25-30-preflight");

const SHA = "a3a8bb9fca2a41479230135f5cd94782c22821bc";

test("MSE-25.30 ignore toute surcharge d'environnement de l'origine GitHub", () => {
  const previous = process.env.MSE_25_30_GITHUB_API_ORIGIN;
  process.env.MSE_25_30_GITHUB_API_ORIGIN = "https://attacker.invalid";
  try {
    const url = baselineWorkflowRunsUrl(SHA);
    assert.ok(url.startsWith(`${DEFAULT_GITHUB_API_ORIGIN}/repos/`));
    assert.equal(url.includes("attacker.invalid"), false);
  } finally {
    if (previous === undefined) delete process.env.MSE_25_30_GITHUB_API_ORIGIN;
    else process.env.MSE_25_30_GITHUB_API_ORIGIN = previous;
  }
});

test("MSE-25.30 autorise une origine injectée uniquement par appel direct de test", () => {
  const url = baselineWorkflowRunsUrl(SHA, { githubApiOrigin: "https://fixture.invalid" });
  assert.ok(url.startsWith("https://fixture.invalid/repos/"));
});
