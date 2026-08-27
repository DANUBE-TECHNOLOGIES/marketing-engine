import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routeSourcePath = path.resolve(
  __dirname,
  "../app/api/public-render-sites/[[...path]]/route.js"
);
const clientSourcePath = path.resolve(__dirname, "../lib/public-site-api.js");
const contractSourcePath = path.resolve(__dirname, "../lib/public-render-contract.js");

test("MSE-25.71 SSR uses the shared direct compact render contract", () => {
  const source = fs.readFileSync(clientSourcePath, "utf8");

  assert.match(source, /loadPublicRenderContract\(siteSlug\)/);
  assert.match(source, /const getContract = cache\(async \(siteSlug\) =>\s*loadPublicRenderContract/s);
  assert.match(source, /await loadPublicRenderContract\(siteSlug, pageSlug\)/);
  assert.doesNotMatch(source, /requestFrom\("\/api\/public-render-sites"/);
  assert.doesNotMatch(source, /requestRender\(/);
});

test("MSE-25.71 compact contract strips repeated page aliases before SSR", () => {
  const source = fs.readFileSync(contractSourcePath, "utf8");

  assert.match(source, /content\?\.__builderType/);
  assert.match(source, /hasJsonContent \? \{ jsonContent: content \} : \{\}/);
  assert.match(source, /block\?\.sectionType/);
  assert.match(source, /pages/);
  assert.match(source, /home/);
});

test("MSE-25.71 compact API delegates to the shared backend-direct loader", () => {
  const source = fs.readFileSync(routeSourcePath, "utf8");

  assert.match(source, /loadPublicRenderContract\(siteSlug, pageSlug, request\)/);
  assert.match(source, /x-public-render-contract-version/);
  assert.match(source, /x-public-render-source/);
  assert.match(source, /backend-direct-shared/);
  assert.doesNotMatch(source, /\/api\/public-sites/);
});
