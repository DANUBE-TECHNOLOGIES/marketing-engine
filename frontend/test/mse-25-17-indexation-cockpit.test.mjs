import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.17 proxy exposes only explicit Search Console cockpit operations", () => {
  const source = read("app/api/indexation/route.js");

  assert.match(source, /search-console-submissions\/health/);
  assert.match(source, /search-console-submissions\/candidates/);
  assert.match(source, /search-console-submissions\/properties/);
  assert.match(source, /search-console-submissions\/preflight/);
  assert.match(source, /search-console-submissions\/prepare/);
  assert.match(source, /\/approve/);
  assert.match(source, /\/submit/);
  assert.match(source, /x-tenant-slug/);
  assert.match(source, /cache:\s*["']no-store["']/);
});

test("MSE-25.17 client keeps preflight, prepare, approval and submission distinct", () => {
  const api = read("lib/indexation-api.js");

  assert.match(api, /preflight:/);
  assert.match(api, /prepare:/);
  assert.match(api, /approve:/);
  assert.match(api, /submit:/);
  assert.match(api, /action\(["']approve["']/);
  assert.match(api, /action\(["']submit["']/);
});

test("MSE-25.17 cockpit never submits automatically", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.match(source, /Approbation explicite obligatoire/);
  assert.match(source, /Soumission automatique désactivée/);
  assert.match(source, /run\?\.status === ["']awaiting_approval["']/);
  assert.match(source, /run\?\.status === ["']approved["']/);
  assert.match(source, /Approuver explicitement/);
  assert.match(source, /Soumettre à Google Search Console/);
  assert.match(source, /onClick=\{\(\) => submit\(site, run\)\}/);

  const effects = [...source.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[\]\);/g)]
    .map((match) => match[1])
    .join("\n");
  assert.doesNotMatch(effects, /\.submit\(/);
  assert.doesNotMatch(effects, /submit\(site/);
  assert.doesNotMatch(effects, /\.approve\(/);
});

test("MSE-25.17 requires a successful preflight before preparation", () => {
  const source = read("app/indexation/IndexationCockpitClient.js");

  assert.match(source, /preflights\[site\.siteSlug\]\?\.ready/);
  assert.match(source, /Un préflight valide est requis avant de préparer la soumission/);
  assert.match(source, /disabled=\{!preflightOk/);
  assert.match(source, /Aucune donnée n’a été envoyée à Google/);
});

test("MSE-25.17 page is an internal noindex operations screen", () => {
  const page = read("app/indexation/page.js");
  const css = read("app/indexation/indexation.css");

  assert.match(page, /robots:/);
  assert.match(page, /index:\s*false/);
  assert.match(page, /follow:\s*false/);
  assert.match(page, /IndexationCockpitClient/);
  assert.match(css, /\.provider-banner/);
  assert.match(css, /\.indexation-status-awaiting_approval/);
  assert.match(css, /\.submit-button/);
});
