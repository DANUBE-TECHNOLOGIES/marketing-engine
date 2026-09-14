import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteHeader.js"),
  "utf8",
);

const layout = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/layout.js"),
  "utf8",
);

test("MSE-25.171 global header no longer auto-claims personalized advice or lifecycle support", () => {
  assert.doesNotMatch(source, /Conseils personnalisés/);
  assert.doesNotMatch(source, /Accompagnement avant, pendant et après/);
  assert.match(source, /PublicOpeningStatus/);
});

test("MSE-25.171 contact CTA exists only when contact is in published navigation", () => {
  assert.match(source, /const publishedPages = uniquePublishedNavigation\(site\)/);
  assert.match(source, /const contactPage = publishedPageBySlug\(publishedPages, "contact"\)/);
  assert.match(source, /\{contactPage \? \(/);
  assert.match(source, /href=\{pageHref\(site\.slug, contactPage\)\}/);
  assert.match(source, /\{contactPage\.title\}/);
  assert.doesNotMatch(source, /href=\{`\/agence\/\$\{site\.slug\}\/contact`\}/);
});

test("MSE-25.171 contact resolution remains publication-grounded while main navigation may include managed routes", () => {
  assert.match(source, /function publishedPageBySlug\(pages, slug\)/);
  assert.match(source, /pageSlug\(page\) === target/);
  assert.match(source, /const publishedPages = uniquePublishedNavigation\(site\)/);
  assert.match(source, /const pages = uniquePublicNavigation\(site\)/);
  assert.match(source, /publishedPageBySlug\(publishedPages, "contact"\)/);
});

test("MSE-25.171 grounded header is the global public agency header", () => {
  assert.match(layout, /<PublicSiteHeader/);
  assert.match(layout, /site=\{site\}/);
});
