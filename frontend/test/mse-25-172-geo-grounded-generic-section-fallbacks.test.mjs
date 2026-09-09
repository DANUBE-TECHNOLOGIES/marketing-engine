import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteSections.js"),
  "utf8",
);

test("MSE-25.172 agency and hero fallbacks stay on published agency facts", () => {
  assert.match(source, /function fallbackAgencyDescription\(site\)/);
  assert.match(source, /Retrouvez les informations publiques de votre agence de voyages/);
  assert.doesNotMatch(source, /vous accompagne avant, pendant et après votre voyage/);
  assert.doesNotMatch(source, /vous accompagne dans la création de vos plus beaux voyages/);
});

test("MSE-25.172 generic cards do not manufacture expertise", () => {
  assert.match(source, /title\|\|"Contenu publié"/);
  assert.match(source, /Aucun contenu complémentaire n’est actuellement publié dans cette section/);
  assert.doesNotMatch(source, /title\|\|"Notre expertise"/);
});

test("MSE-25.172 generic contact CTAs require a published contact page", () => {
  assert.match(source, /publishedNavigationPage\(site,"contact"\)/);
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /publishedPageHref\(site\.slug,contactPage\)/);
  assert.doesNotMatch(source, /publicPageHref\(site,"contact"\)/);
});

test("MSE-25.172 generic CTA labels reuse configured or published content", () => {
  assert.match(source, /content\.secondaryButton\|\|content\.secondaryCta\?\.label\|\|contactPage\.title/);
  assert.match(source, /content\.primaryButton\|\|content\.primaryCta\?\.label\|\|contactPage\.title/);
  assert.doesNotMatch(source, /\|\|"Demander un devis"/);
});
