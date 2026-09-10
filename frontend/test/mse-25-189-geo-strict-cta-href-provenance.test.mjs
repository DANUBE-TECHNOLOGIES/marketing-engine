import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/CtaV2Renderer.js"),
  "utf8",
);

test("MSE-25.189 requires a structured CTA label and keeps non-quote targets explicit", () => {
  assert.match(source, /const label = String\(cta\?\.label \|\| ""\)\.trim\(\)/);
  assert.match(source, /if \(!label\) return null/);
  assert.match(source, /const href = explicitCtaHref\(site, cta\?\.href\)/);
  assert.match(source, /return href \? \{ label, href \} : null/);
});

test("MSE-25.189 permits only the managed quote-form exception from a quote CTA label", () => {
  assert.match(source, /isQuoteCtaLabel\(label\)/);
  assert.match(source, /quoteRequestHref\(site, \{ source: "general" \}\)/);
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
