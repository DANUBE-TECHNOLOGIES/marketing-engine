import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sections = fs.readFileSync(path.join(root, "components/public-site/PublicSiteSections.js"), "utf8");
const page = fs.readFileSync(path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"), "utf8");

test("MSE-25.30 renders the optimized hero title as the public H1", () => {
  assert.match(sections, /function HeroSection/);
  assert.match(sections, /<h1>\{title\}<\/h1>/);
  assert.match(sections, /content\.title \|\| content\.heading/);
});

test("MSE-25.30 avoids adding a second fallback H1 when a hero exists", () => {
  assert.match(page, /needsFallbackHeading = !legalPage && !pageHasHero\(page\)/);
  assert.match(page, /<h1>\{localSeo\.heading\}<\/h1>/);
});
