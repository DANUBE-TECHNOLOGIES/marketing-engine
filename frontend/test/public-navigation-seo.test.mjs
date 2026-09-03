import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const header = await readFile(
  new URL("../components/public-site/PublicSiteHeader.js", import.meta.url),
  "utf8"
);
const footer = await readFile(
  new URL("../components/public-site/PublicSiteFooter.js", import.meta.url),
  "utf8"
);
const page = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);
const localSeo = await readFile(
  new URL("../lib/seo/local-page-seo.js", import.meta.url),
  "utf8"
);

test("header canonicalizes aliases and removes duplicate navigation targets", () => {
  assert.match(header, /inspirations:\s*"inspiration"/);
  assert.match(header, /uniquePublishedNavigation/);
  assert.match(header, /seen\.has\(key\)/);
  assert.match(header, /canonicalNavigationSlug/);
});

test("footer only exposes optional pages that are published", () => {
  assert.match(footer, /hasServicesPage/);
  assert.match(footer, /hasDestinationsPage/);
  assert.match(footer, /hasReviewsPage/);
  assert.match(footer, /hasContactPage/);
  assert.match(footer, /Inspirations voyage/);
});

test("public content pages get a localized H1 when no hero block exists", () => {
  assert.match(page, /pageHasHero/);
  assert.match(page, /needsFallbackHeading/);
  assert.match(page, /<h1>\{localSeo\.heading\}<\/h1>/);
  assert.match(localSeo, /headingForKind/);
  assert.match(localSeo, /Services de votre agence de voyages à/);
  assert.match(localSeo, /Avis clients de votre agence de voyages à/);
});
