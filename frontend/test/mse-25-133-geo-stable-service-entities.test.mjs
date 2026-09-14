import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.133 published services receive deterministic canonical entity identifiers", () => {
  assert.match(jsonLd, /function serviceEntityId\(url, name\)/);
  assert.match(jsonLd, /#service-\$\{encodeURIComponent\(key\)\}/);
  assert.match(jsonLd, /"@id": serviceEntityId\(url, service\.name\)/);
});

test("MSE-25.133 service identity remains grounded in the published service name", () => {
  assert.match(jsonLd, /const services = extractPublishedServices\(page\)/);
  assert.match(jsonLd, /name: service\.name/);
  assert.match(jsonLd, /description: service\.description/);
});

test("MSE-25.133 every published service keeps the exact local agency as provider", () => {
  assert.match(jsonLd, /const providerId = `\$\{absoluteUrl\(site\.basePath\)\}#travel-agency`/);
  assert.match(jsonLd, /"@type": "TravelAgency"/);
  assert.match(jsonLd, /"@id": providerId/);
  assert.match(jsonLd, /url: absoluteUrl\(site\.basePath\)/);
});

test("MSE-25.133 does not manufacture transactional facts or unsupported expertise", () => {
  const catalogStart = jsonLd.indexOf("export function buildServiceCatalogSchema");
  const catalogEnd = jsonLd.indexOf("export function buildBreadcrumbSchema", catalogStart);
  const catalog = jsonLd.slice(catalogStart, catalogEnd);

  assert.doesNotMatch(catalog, /price|availability|inventory|stock/i);
  assert.doesNotMatch(catalog, /knowsAbout|expertise|specialist/i);
});
