import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/AppointmentRenderer.js"),
  "utf8",
);

test("MSE-25.176 appointment renderer no longer invents commercial copy", () => {
  assert.doesNotMatch(source, /Rendez-vous personnalisé/);
  assert.doesNotMatch(source, /Prenons le temps de parler de votre voyage/);
  assert.doesNotMatch(source, /Choisissez un créneau pour échanger avec un conseiller/);
  assert.doesNotMatch(source, /Prendre rendez-vous/);
});

test("MSE-25.176 appointment renderer reuses published canonical contact navigation", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /pageSlug\(page\) === "contact"/);
  assert.match(source, /pageHref\(site\.slug, contactPage\)/);
  assert.doesNotMatch(source, /`\/sites\/\$\{site\.slug\}\/contact`/);
});

test("MSE-25.176 appointment CTA requires a published label and a resolvable target", () => {
  assert.match(source, /const label = structured\?\.label \|\| content\.primaryButton \|\| null;/);
  assert.match(source, /if \(!label\) return null;/);
  assert.match(source, /if \(!explicitHref && !contactPage\) return null;/);
});

test("MSE-25.176 empty appointment sections render nothing", () => {
  assert.match(source, /if \(!kicker && !title && !text && !cta\) return null;/);
});
