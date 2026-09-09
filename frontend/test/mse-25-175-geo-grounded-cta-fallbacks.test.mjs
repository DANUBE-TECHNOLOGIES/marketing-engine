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

test("MSE-25.175 preserves explicitly published structured and legacy CTA labels", () => {
  assert.match(source, /content\.primaryCta \|\| legacyCta\(content\.primaryButton\)/);
  assert.match(source, /content\.secondaryCta \|\| legacyCta\(content\.secondaryButton\)/);
  assert.match(source, /if \(!cta\?\.label\) return null;/);
  assert.match(source, /resolvePublicCtaHref\(site, cta\.href, "contact", \{ label: cta\.label \}\)/);
});

test("MSE-25.175 keeps historical home suppression", () => {
  assert.match(source, /if \(isHomePage\(page\)\) return null;/);
});
