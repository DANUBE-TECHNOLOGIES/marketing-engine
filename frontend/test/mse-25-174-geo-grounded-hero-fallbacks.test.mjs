import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/HeroV2Renderer.js"),
  "utf8",
);

test("MSE-25.174 hero fallback subtitle stays factual", () => {
  assert.match(source, /Retrouvez les informations publiées par votre agence de voyages/);
  assert.doesNotMatch(source, /Votre agence vous accompagne dans la création de vos plus beaux voyages/);
  assert.match(source, /resolvedHeroSubtitle\(\{ content, site \}\)/);
});

test("MSE-25.174 hero does not invent primary or secondary CTA labels", () => {
  assert.match(source, /const primaryLabel = ctaLabel\(primaryCta, content\.primaryButton\);/);
  assert.match(source, /const secondaryLabel = ctaLabel\(secondaryCta, content\.secondaryButton\);/);
  assert.doesNotMatch(source, /ctaLabel\(primaryCta, content\.primaryButton, "Demander un devis"\)/);
  assert.doesNotMatch(source, /immersiveNetworkHero \? "Découvrir nos voyages" : "Nous contacter"/);
});

test("MSE-25.174 hero only resolves CTA hrefs when a published label exists", () => {
  assert.match(source, /const primaryHref = primaryLabel/);
  assert.match(source, /const secondaryHref = secondaryLabel/);
  assert.match(source, /Boolean\(primaryLabel\) && isShowcaseCta/);
  assert.match(source, /Boolean\(secondaryLabel\) && isShowcaseCta/);
});

test("MSE-25.174 preserves explicitly configured and legacy CTA paths", () => {
  assert.match(source, /primaryCta\?\.href/);
  assert.match(source, /secondaryCta\.href/);
  assert.match(source, /content\.primaryButton/);
  assert.match(source, /content\.secondaryButton/);
  assert.match(source, /getShowcaseUrl\(site\)/);
});
