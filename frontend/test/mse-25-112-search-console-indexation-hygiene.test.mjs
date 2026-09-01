import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const robots = await readFile(
  new URL("../app/robots.js", import.meta.url),
  "utf8"
);

const sitemap = await readFile(
  new URL("../app/sitemap.js", import.meta.url),
  "utf8"
);

const quotePage = await readFile(
  new URL("../app/agence/[siteSlug]/demande-devis/page.js", import.meta.url),
  "utf8"
);

const localContext = await readFile(
  new URL("../components/public-site/LocalContentContext.js", import.meta.url),
  "utf8"
);

const backendSitemap = await readFile(
  new URL("../../backend/src/modules/minisite-structured-data/sitemap.js", import.meta.url),
  "utf8"
);

test("robots keeps public noindex surfaces crawlable", () => {
  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/login"/);
  assert.match(robots, /"\/actions\/"/);

  assert.doesNotMatch(robots, /"\/sites\/"/);
  assert.doesNotMatch(robots, /"\/admin\/"/);
  assert.doesNotMatch(robots, /"\/website-builder\/"/);
});

test("global sitemap excludes non-indexable pages and preserves editorial nested routes", () => {
  assert.match(sitemap, /"demande-devis"/);
  assert.match(sitemap, /"mentions-legales"/);
  assert.match(sitemap, /INDEXABLE_NESTED_ROUTE_PREFIXES/);
  assert.match(sitemap, /"destination"/);
  assert.match(sitemap, /"inspiration"/);
  assert.match(sitemap, /parts\.length === 4/);
});

test("backend sitemap agrees that quote pages are not indexable", () => {
  assert.match(backendSitemap, /NOINDEX_SLUGS/);
  assert.match(backendSitemap, /"demande-devis"/);
});

test("quote request page is crawlable but explicitly noindex", () => {
  assert.match(quotePage, /alternates:\s*\{ canonical \}/);
  assert.match(quotePage, /index:\s*false/);
  assert.match(quotePage, /follow:\s*true/);
  assert.match(quotePage, /\/demande-devis/);
});

test("thin local pages receive differentiated context across public intents", () => {
  for (const kind of ["agency", "inspirations", "commitments", "partners"]) {
    assert.match(localContext, new RegExp(`\\b${kind}:`));
  }

  assert.match(localContext, /kind !== "inspirations"/);
});
