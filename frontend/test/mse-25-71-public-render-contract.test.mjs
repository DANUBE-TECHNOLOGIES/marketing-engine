import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSourcePath = path.resolve(
  __dirname,
  "../app/api/public-render-sites/[[...path]]/route.js"
);
const clientSourcePath = path.resolve(__dirname, "../lib/public-site-api.js");

test("MSE-25.71 SSR uses the compact render contract", () => {
  const source = fs.readFileSync(clientSourcePath, "utf8");

  assert.match(source, /requestFrom\("\/api\/public-render-sites", path\)/);
  assert.match(source, /const getContract = cache\(async \(siteSlug\) =>\s*requestRender/s);
  assert.match(source, /await requestRender\(\s*`\/\$\{encodeURIComponent\(siteSlug\)\}\/pages\//s);
});

test("MSE-25.71 compact contract strips repeated page aliases", () => {
  const source = fs.readFileSync(apiSourcePath, "utf8");

  assert.match(source, /sections: _sections/);
  assert.match(source, /contentBlocks: _contentBlocks/);
  assert.match(source, /pages: _pages/);
  assert.match(source, /homePage: _homePage/);
  assert.match(source, /pages: selectedPage \? \[selectedPage\] : \[\]/);
  assert.match(source, /x-public-render-contract-version/);
});

test("MSE-25.71 legacy public contract remains the source of truth", () => {
  const source = fs.readFileSync(apiSourcePath, "utf8");

  assert.match(source, /\/api\/public-sites\$\{targetPath\}/);
  assert.match(source, /next: \{ revalidate: REVALIDATE_SECONDS \}/);
  assert.doesNotMatch(source, /cache:\s*"no-store"/);
});
