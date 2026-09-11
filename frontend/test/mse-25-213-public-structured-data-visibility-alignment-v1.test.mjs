import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");
const blockUtils = fs.readFileSync(path.join(root, "components/page-builder/shared/blockUtils.js"), "utf8");
const faqSchema = fs.readFileSync(path.join(root, "lib/seo/page-faq-schema.js"), "utf8");
const pageRoute = fs.readFileSync(path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"), "utf8");
const localArea = fs.readFileSync(path.join(root, "lib/seo/local-area-config.js"), "utf8");

function between(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(a, -1, `start marker absent: ${start}`);
  assert.notEqual(b, -1, `end marker absent: ${end}`);
  return source.slice(a, b);
}

test("ServiceCatalog suit le même contrat de visibilité que le renderer public", () => {
  assert.match(jsonLd, /isSectionVisible/);
  const extractor = between(jsonLd, "export function extractPublishedServices", "function uniqueUrls");
  assert.match(extractor, /if \(!isSectionVisible\(entry\)\) continue;/);
  assert.doesNotMatch(extractor, /status === ["']draft["']/);
  assert.doesNotMatch(extractor, /status === ["']hidden["'] \|\| status === ["']draft["']/);

  const visibility = between(blockUtils, "export function isSectionVisible", "export function sortSections");
  assert.match(visibility, /status === "hidden"/);
  assert.match(visibility, /visibleDesktop === false && section\?\.visibleMobile === false/);
  assert.doesNotMatch(visibility, /status === "draft"/);
});

test("FAQPage n'est émis qu'une fois comme entité complète; WebPage ne garde qu'une référence @id", () => {
  const reference = between(faqSchema, "function faqReference", "export function buildPageFaqSchema");
  assert.match(reference, /"@type": "FAQPage"/);
  assert.match(reference, /"@id": faqSchema\["@id"\]/);
  assert.doesNotMatch(reference, /mainEntity/);

  const builder = between(faqSchema, "export function buildPageFaqSchema", "export function linkFaqToWebPage");
  assert.match(builder, /mainEntity:/);
  assert.match(builder, /"@id": `\$\{canonicalUrl\}#faq`/);

  assert.match(pageRoute, /const faqSchema = legalPage \? null : buildPageFaqSchema/);
  assert.match(pageRoute, /linkFaqToWebPage\(baseWebPageSchema, faqSchema\)/);
  assert.match(pageRoute, /\{faqSchema \? <JsonLd data=\{faqSchema\} \/> : null\}/);
});

test("Melun et Lamorlaye gardent leurs zones locales existantes", () => {
  assert.match(localArea, /"tui-store-melun": \[/);
  for (const city of ["Dammarie-les-Lys", "Le Mée-sur-Seine", "Vaux-le-Pénil", "La Rochette", "Rubelles", "Vert-Saint-Denis"]) {
    assert.match(localArea, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(localArea, /"mondescale-lamorlaye": \[/);
  for (const city of ["Chantilly", "Gouvieux", "Coye-la-Forêt", "Chaumontel", "Orry-la-Ville"]) {
    assert.match(localArea, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("la correction MSE-25.213 ne modifie ni identité réseau ni contrat GEO", () => {
  assert.match(jsonLd, /name: "Mondescale Voyages"/);
  assert.match(jsonLd, /latitude = agency\?\.latitude \?\? site\?\.latitude/);
  assert.match(jsonLd, /longitude = agency\?\.longitude \?\? site\?\.longitude/);
  assert.match(jsonLd, /areaServed: servedAreas\(site, agency\)/);
  assert.match(jsonLd, /openingHoursSpecification:/);
});
