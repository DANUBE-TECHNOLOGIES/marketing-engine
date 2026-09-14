import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/CtaV2Renderer.js"),
  "utf8",
);

test("MSE-25.175 CTA renderer no longer invents commercial fallback copy", () => {
  assert.doesNotMatch(source, /Préparons votre prochain voyage/);
  assert.doesNotMatch(source, /Demander un devis/);
  assert.match(source, /getSectionTitle\(section, null\)/);
});

test("MSE-25.175 empty CTA sections render nothing", () => {
  assert.match(source, /if \(!title && !text && !hasPrimaryCta && !hasSecondaryCta\) return null;/);
  assert.match(source, /\{title \? <h2>\{title\}<\/h2> : null\}/);
});

test("MSE-25.175 preserves only explicitly published structured CTA actions", () => {
  assert.match(source, /configuredCta\(site, content\.primaryCta\)/);
  assert.match(source, /configuredCta\(site, content\.secondaryCta\)/);
  assert.doesNotMatch(source, /legacyCta/);
  assert.doesNotMatch(source, /content\.primaryButton/);
  assert.doesNotMatch(source, /content\.secondaryButton/);
});

test("MSE-25.175 keeps historical home suppression", () => {
  assert.match(source, /if \(isHomePage\(page\)\) return null;/);
});
