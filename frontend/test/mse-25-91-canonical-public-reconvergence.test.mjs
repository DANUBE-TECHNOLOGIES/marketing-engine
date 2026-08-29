import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.91 preserves canonical public brand logo runtime", () => {
  const source = read("components/public-site/PublicBrandLogo.js");
  assert.match(source, /data-public-brand-logo="1"/);
  assert.match(source, /brandAssets/);
  assert.match(source, /site\?\.brandProfile\?\.assets/);
});

test("MSE-25.91 preserves team portrait fallbacks from canonical lineage", () => {
  const source = read("components/public-site/renderers/TeamRenderer.js");
  assert.match(source, /member\.avatar/);
  assert.match(source, /member\.media\?\.url/);
  assert.match(source, /Portrait de \$\{name\}/);
});

test("MSE-25.91 preserves home partner network and agency partner selection", () => {
  const source = read("components/public-site/renderers/PartnersRenderer.js");
  assert.match(source, /getCommonPartners/);
  assert.match(source, /NetworkPartnerGrid/);
  assert.match(source, /selectAgencyPartners/);
  assert.match(source, /Notre sélection principale/);
});

test("MSE-25.91 keeps canonical immersive hero and routes travel CTA to showcase", () => {
  const source = read("components/public-site/renderers/HeroV2Renderer.js");
  assert.match(source, /public-site-hero--immersive/);
  assert.match(source, /NETWORK_HOME_HERO_IMAGE/);
  assert.match(source, /getShowcaseUrl\(site\)/);
  assert.match(source, /Découvrir nos voyages/);
});

test("MSE-25.91 keeps payment band before footer and Visa visible", () => {
  const layout = read("app/agence/[siteSlug]/layout.js");
  const payment = read("components/public-site/PublicPaymentMethodsBand.js");
  assert.ok(layout.indexOf("<PublicPaymentMethodsBand />") < layout.indexOf("<PublicSiteFooter site={site} />"));
  assert.match(payment, /label: "Visa"/);
  assert.match(payment, /mark: "VISA"/);
});

test("MSE-25.91 never emits bare mondescale.com showcase host", () => {
  const source = read("lib/showcase-url.js");
  assert.match(source, /https:\/\/www\.mondescale\.com/);
  assert.match(source, /url\.hostname = "www\.mondescale\.com"/);
});
