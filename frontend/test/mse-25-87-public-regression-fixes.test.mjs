import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const showcase = read("lib/showcase-url.js");
const hero = read("components/public-site/renderers/HeroV2Renderer.js");
const logo = read("components/public-site/PublicBrandLogo.js");
const team = read("components/public-site/renderers/TeamRenderer.js");
const layout = read("app/agence/[siteSlug]/layout.js");
const payment = read("components/public-site/PublicPaymentMethodsBand.js");
const paymentCss = read("components/public-site/payment-methods-band.css");
const readability = read("components/public-site/public-readability-fixes.css");

test("MSE-25.87 routes the showcase away from the bare apex directory index", () => {
  assert.match(showcase, /DEFAULT_SHOWCASE_URL\s*=\s*"https:\/\/www\.mondescale\.com"/);
  assert.match(showcase, /hostname\.toLowerCase\(\) === "mondescale\.com"/);
  assert.match(showcase, /url\.hostname = "www\.mondescale\.com"/);
});

test("MSE-25.87 sends Découvrir vos voyages to the external showcase", () => {
  assert.match(hero, /function isShowcaseCta/);
  assert.match(hero, /getShowcaseUrl\(site\)/);
  assert.match(hero, /primaryShowcase/);
  assert.match(hero, /target: "_blank"/);
});

test("MSE-25.87 keeps resilient header-logo resolution", () => {
  for (const key of ["logoPrimary", "primaryLogo", "logoUrl", "logoLight", "logoDark"]) {
    assert.match(logo, new RegExp(key));
  }
  for (const key of ["publicUrl", "assetUrl", "fileUrl"]) {
    assert.match(logo, new RegExp(key));
  }
});

test("MSE-25.87 restores team portraits from string or asset-object contracts", () => {
  assert.match(team, /function memberImageUrl/);
  for (const key of ["imageUrl", "photoUrl", "portraitUrl", "publicUrl", "assetUrl", "fileUrl"]) {
    assert.match(team, new RegExp(key));
  }
});

test("MSE-25.87 restores Visa payment visibility before the public footer", () => {
  assert.match(layout, /PublicPaymentMethodsBand/);
  assert.match(layout, /<PublicPaymentMethodsBand\s*\/>[\s\S]*<PublicSiteFooter/);
  assert.match(payment, /key:\s*"visa"/);
  assert.match(payment, /label:\s*"Visa"/);
  assert.match(payment, /mark:\s*"VISA"/);
  assert.match(payment, /public-payment-mark-fallback/);
  assert.match(paymentCss, /payment-mark-visa/);
});

test("MSE-25.87 reduces the oversized desktop hero while preserving mobile treatment", () => {
  assert.match(readability, /min-height:\s*clamp\(430px,\s*56vh,\s*590px\)\s*!important/);
  assert.match(readability, /font-size:\s*clamp\(2\.7rem,\s*5\.2vw,\s*4\.9rem\)\s*!important/);
  assert.match(readability, /@media\s*\(max-width:\s*760px\)/);
});
