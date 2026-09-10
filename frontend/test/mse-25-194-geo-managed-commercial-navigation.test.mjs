import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const headerSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteHeader.js"),
  "utf8",
);
const localContextSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/LocalContentContext.js"),
  "utf8",
);

test("MSE-25.194 restores the two explicit managed commercial routes", () => {
  assert.match(headerSource, /slug: "voyages-affaires", title: "Voyages d’affaires"/);
  assert.match(headerSource, /slug: "groupes", title: "Groupes"/);
  assert.match(headerSource, /const MANAGED_PUBLIC_ROUTES = Object\.freeze/);
});

test("MSE-25.194 keeps CMS publication provenance strict while extending public navigation", () => {
  assert.match(headerSource, /function uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /function uniquePublicNavigation\(site\)/);
  assert.match(headerSource, /const published = uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /return \[\.\.\.published, \.\.\.managed\]/);
  assert.match(headerSource, /const publishedPages = uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /const pages = uniquePublicNavigation\(site\)/);
  assert.match(headerSource, /publishedPageBySlug\(publishedPages, "contact"\)/);
});

test("MSE-25.194 exposes grounded public navigation in local context without reviving generic fabricated routes", () => {
  assert.match(localContextSource, /uniquePublicNavigation\(site\)/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/services`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/contact`/);
});

test("MSE-25.194 keeps managed route deduplication slug based", () => {
  assert.match(headerSource, /new Set\(published\.map\(\(page\) => pageSlug\(page\) \|\| "__home__"\)\)/);
  assert.match(headerSource, /if \(!slug \|\| seen\.has\(slug\)\) return false/);
  assert.match(headerSource, /seen\.add\(slug\)/);
});
