import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

test("public site data is revalidated instead of forced no-store", () => {
  const api = source("lib/public-site-api.js");
  assert.doesNotMatch(api, /cache:\s*["']no-store["']/);
  assert.match(api, /revalidate:\s*PUBLIC_DATA_REVALIDATE_SECONDS/);
  assert.match(api, /PUBLIC_SITE_REVALIDATE_SECONDS/);
});

test("brand legal runtime participates in the public cache", () => {
  const runtime = source("lib/public-brand-legal-runtime.js");
  assert.doesNotMatch(runtime, /cache:\s*["']no-store["']/);
  assert.match(runtime, /revalidate:\s*PUBLIC_RUNTIME_REVALIDATE_SECONDS/);
});

test("agency route enables ISR and public rendering guardrails", () => {
  const layout = source("app/agence/[siteSlug]/layout.js");
  const css = source("components/public-site/public-performance.css");

  assert.match(layout, /export const revalidate = 300/);
  assert.match(layout, /public-performance\.css/);
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /contain-intrinsic-size:\s*auto 720px/);
  assert.match(css, /backdrop-filter:\s*none/);
});
