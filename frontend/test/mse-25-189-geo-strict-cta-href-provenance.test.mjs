import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/CtaV2Renderer.js"),
  "utf8",
);

test("MSE-25.189 requires explicit CTA label and href", () => {
  assert.match(source, /const label = String\(cta\?\.label \|\| ""\)\.trim\(\)/);
  assert.match(source, /const href = explicitCtaHref\(site, cta\?\.href\)/);
  assert.match(source, /return label && href \? \{ label, href \} : null/);
});

test("MSE-25.189 does not infer contact or quote routes from labels", () => {
  assert.doesNotMatch(source, /fallbackSlug/);
  assert.doesNotMatch(source, /"contact", \{ label:/);
  assert.doesNotMatch(source, /legacyCta/);
  assert.doesNotMatch(source, /primaryButton/);
  assert.doesNotMatch(source, /secondaryButton/);
});

test("MSE-25.189 rejects dangerous explicit href schemes", () => {
  assert.match(source, /javascript:\|data:\|vbscript:/);
  assert.match(source, /resolvePublicCtaHref\(site, value, "", \{ label: "" \}\)/);
});
