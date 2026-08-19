import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("public partner page uses its page-header as the single primary heading", () => {
  const route = read("app/agence/[siteSlug]/[[...pageSlug]]/page.js");
  const pageHeader = read("components/public-site/renderers/PageHeaderRenderer.js");

  assert.match(route, /function sectionType\(section\)/);
  assert.match(route, /section\?\.sectionType/);
  assert.match(route, /section\?\.jsonContent\?\.__builderType/);
  assert.match(route, /function pageHasPrimaryHeadingSection\(page\)/);
  assert.match(route, /sectionType\(section\) === "page-header"/);
  assert.match(route, /!pageHasHero\(page\) && !pageHasPrimaryHeadingSection\(page\)/);
  assert.match(pageHeader, /<h1>\{title\}<\/h1>/);
});

test("partner directory is treated as functional public content and remains indexable", () => {
  const quality = read("lib/seo/local-content-quality.js");
  const route = read("app/agence/[siteSlug]/[[...pageSlug]]/page.js");

  assert.match(quality, /"partner"/);
  assert.match(quality, /block\?\.sectionType/);
  assert.match(quality, /block\?\.jsonContent\?\.__builderType/);
  assert.match(quality, /replace\(\/--\\d\+\$\/, ""\)/);
  assert.match(route, /const indexable = !legalPage && !quality\.criticallyThin/);
  assert.match(route, /return `\$\{root\}\/\$\{slug\}`/);
});
