import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/GroupTravelPage.js"),
  "utf8",
);
const routeSource = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/voyages-en-groupe/page.js"),
  "utf8",
);

test("MSE-25.196 preserves Group Travel editorial inspiration and commercial richness", () => {
  assert.match(pageSource, /const TRIPS=/);
  assert.match(pageSource, /id="inspirations"/);
  assert.match(pageSource, /destination:"Albanie"/);
  assert.match(pageSource, /destination:"Grèce"/);
  assert.match(pageSource, /destination:"Méditerranée"/);
  assert.match(pageSource, /destination:"Afrique australe"/);
  assert.match(pageSource, /format:"Circuit"/);
  assert.match(pageSource, /format:"Croisière"/);
  assert.match(pageSource, /format:"Week-end"/);
  assert.match(pageSource, /const GROUP_TYPES=/);
  assert.match(pageSource, /const STEPS=/);
  assert.match(pageSource, /Voyager ensemble, sans voyager comme tout le monde/);
});

test("MSE-25.196 labels inspiration content and example durations without presenting inventory guarantees", () => {
  assert.match(pageSource, /inspirations éditoriales/);
  assert.match(pageSource, /durées indiquées sont des exemples/);
  assert.match(pageSource, /disponibilités au moment de la demande/);
  assert.doesNotMatch(pageSource, /(?:places|cabines) disponibles/i);
  assert.doesNotMatch(pageSource, /disponibilité garantie/i);
  assert.doesNotMatch(pageSource, /(?:à partir de|prix|tarif)\s*[:€\d]/i);
});

test("MSE-25.196 routes every Group Travel conversion through managed quote authority", () => {
  assert.match(pageSource, /import \{ quoteRequestHref \} from "\.\/renderers\/ctaLinks"/);
  assert.match(pageSource, /quoteRequestHref\(site,\{source:"group"\}\)/);
  assert.doesNotMatch(pageSource, /`\$\{root\}\/demande-devis/);
  assert.match(pageSource, /href=\{quote\}>Parler de mon projet/);
  assert.match(pageSource, /href=\{quote\}>Imaginer ce voyage avec mon agence/);
  assert.match(pageSource, /<Link href=\{quote\}>/);
});

test("MSE-25.196 preserves the canonical managed Group Travel route and indexability", () => {
  assert.match(routeSource, /\/voyages-en-groupe/);
  assert.match(routeSource, /alternates: \{ canonical \}/);
  assert.match(routeSource, /robots: \{ index: true, follow: true \}/);
  assert.match(routeSource, /buildTravelAgencySchema\(site\)/);
  assert.match(routeSource, /buildBreadcrumbSchema\(breadcrumbs\)/);
});
