import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");
const layout = fs.readFileSync(
  path.join(root, "app/agence/[siteSlug]/layout.js"),
  "utf8"
);

test("GEO V1 canonical agency JSON-LD uses explicit stored service areas only", () => {
  assert.match(jsonLd, /import \{ explicitTargetCities \} from "\.\/local-area-config"/);
  assert.match(jsonLd, /const values = explicitTargetCities\(site\)/);
  assert.doesNotMatch(jsonLd, /resolvedTargetCities/);
});

test("GEO V1 canonical agency JSON-LD links to the stable Mondescale organization", () => {
  assert.match(jsonLd, /https:\/\/www\.mondescale\.com\/#organization/);
  assert.match(jsonLd, /export function buildOrganizationSchema/);
  assert.match(jsonLd, /parentOrganization:/);
  assert.match(layout, /buildOrganizationSchema/);
  assert.match(layout, /<JsonLd data=\{buildOrganizationSchema\(\)\} \/>/);
});

test("GEO V1 keeps local editorial fallback configuration outside structured facts", () => {
  const localAreaConfig = fs.readFileSync(
    path.join(root, "lib/seo/local-area-config.js"),
    "utf8"
  );

  assert.match(localAreaConfig, /LOCAL_AREA_BY_SITE_SLUG/);
  assert.match(localAreaConfig, /resolvedTargetCities/);
  assert.match(jsonLd, /explicitTargetCities/);
});
