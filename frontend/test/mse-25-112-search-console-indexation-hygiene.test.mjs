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

const publicPage = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

const businessTravelPage = await readFile(
  new URL("../app/agence/[siteSlug]/business-travel/page.js", import.meta.url),
  "utf8"
);

const groupTravelPage = await readFile(
  new URL("../app/agence/[siteSlug]/voyages-en-groupe/page.js", import.meta.url),
  "utf8"
);

const legacySiteHome = await readFile(
  new URL("../app/sites/[siteSlug]/page.js", import.meta.url),
  "utf8"
);

const legacySitePage = await readFile(
  new URL("../app/sites/[siteSlug]/[pageSlug]/page.js", import.meta.url),
  "utf8"
);

const proxy = await readFile(
  new URL("../proxy.js", import.meta.url),
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

const backendStructuredDataService = await readFile(
  new URL("../../backend/src/modules/minisite-structured-data/service.js", import.meta.url),
  "utf8"
);

test("robots keeps canonicalization and noindex surfaces crawlable", () => {
  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/login"/);
  assert.match(robots, /"\/actions\/"/);

  assert.doesNotMatch(robots, /"\/sites\/"/);
  assert.doesNotMatch(robots, /"\/admin\/"/);
  assert.doesNotMatch(robots, /"\/website-builder\/"/);
});

test("legacy /sites URLs remain crawlable only to reach permanent canonical redirects", () => {
  assert.match(legacySiteHome, /permanentRedirect/);
  assert.match(legacySiteHome, /`\/agence\/\$\{encodeURIComponent/);
  assert.match(legacySitePage, /permanentRedirect/);
  assert.match(legacySitePage, /pageSlug/);
  assert.match(legacySitePage, /`\/agence\/\$\{encodeURIComponent/);
});

test("unknown technical routes cannot leak on the public mini-site hostname", () => {
  assert.match(proxy, /requestHostname\(request\) === PUBLIC_SITE_HOST/);
  assert.match(proxy, /status:\s*404/);
  assert.match(proxy, /pathname === "\/sites"/);
  assert.match(proxy, /pathname\.startsWith\("\/sites\/"\)/);
});

test("global sitemap excludes non-indexable pages and preserves editorial nested routes", () => {
  assert.match(sitemap, /"demande-devis"/);
  assert.match(sitemap, /"mentions-legales"/);
  assert.match(sitemap, /INDEXABLE_NESTED_ROUTE_PREFIXES/);
  assert.match(sitemap, /"destination"/);
  assert.match(sitemap, /"inspiration"/);
  assert.match(sitemap, /parts\.length === 4/);
});

test("backend sitemap agrees that quote pages are not indexable and canonicalizes page casing", () => {
  assert.match(backendSitemap, /NOINDEX_SLUGS/);
  assert.match(backendSitemap, /"demande-devis"/);
  assert.match(backendSitemap, /normalizeSlug\(value\)\.toLowerCase\(\)/);
});

test("managed indexable special routes are always emitted once per published site", () => {
  assert.match(backendSitemap, /SPECIAL_PUBLIC_PAGE_SLUGS/);
  assert.match(backendSitemap, /"business-travel"/);
  assert.match(backendSitemap, /"voyages-en-groupe"/);
  assert.match(backendSitemap, /for \(const slug of SPECIAL_PUBLIC_PAGE_SLUGS\)/);
  assert.match(backendSitemap, /type:\s*"managed-public-route"/);
  assert.match(backendSitemap, /managedPublicRoutes:/);
  assert.match(backendSitemap, /MANAGED_PAGE_SLUGS = new Set\(\[/);
  assert.match(businessTravelPage, /robots:\s*\{ index: true, follow: true \}/);
  assert.match(groupTravelPage, /robots:\s*\{ index: true, follow: true \}/);
  assert.match(businessTravelPage, /alternates:\s*\{ canonical \}/);
  assert.match(groupTravelPage, /alternates:\s*\{ canonical \}/);
});

test("business travel returns a real 404 for a missing public site", () => {
  assert.match(businessTravelPage, /import \{ notFound \} from "next\/navigation"/);
  assert.match(businessTravelPage, /async function loadSite/);
  assert.match(businessTravelPage, /error\?\.statusCode === 404/);
  assert.match(businessTravelPage, /if \(!site\) notFound\(\)/);
  assert.match(businessTravelPage, /robots:\s*\{ index: false, follow: false \}/);
});

test("quote request page is crawlable but explicitly noindex", () => {
  assert.match(quotePage, /alternates:\s*\{ canonical \}/);
  assert.match(quotePage, /index:\s*false/);
  assert.match(quotePage, /follow:\s*true/);
  assert.match(quotePage, /\/demande-devis/);
});

test("published public pages are not noindexed solely because content is thin", () => {
  assert.match(publicPage, /const indexable = !legalPage;/);
  assert.doesNotMatch(publicPage, /const indexable = !legalPage && !quality\.criticallyThin;/);
  assert.match(publicPage, /data-content-quality=/);
});

test("published pages are not removed from sitemap solely because content is thin", () => {
  assert.doesNotMatch(backendStructuredDataService, /applyContentQualityIndexabilityContract/);
  assert.match(backendStructuredDataService, /published-pages-remain-indexable-runtime-quality-enrichment/);
});

test("generic public page casing redirects to its lowercase canonical route", () => {
  assert.match(publicPage, /function isNonCanonicalPageSlug/);
  assert.match(publicPage, /raw !== normalizePageSlug\(raw\)/);
  assert.match(publicPage, /isAliasPage\(pageSlug\) \|\| isNonCanonicalPageSlug\(pageSlug\)/);
  assert.match(publicPage, /permanentRedirect\(canonicalPath/);
});

test("thin local pages receive differentiated context across public intents", () => {
  for (const kind of ["agency", "inspirations", "commitments", "partners"]) {
    assert.match(localContext, new RegExp(`\\b${kind}:`));
  }

  assert.match(localContext, /kind !== "inspirations"/);
});
