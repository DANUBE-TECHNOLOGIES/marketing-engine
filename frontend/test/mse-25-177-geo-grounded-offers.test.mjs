import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/OffersRenderer.js"),
  "utf8",
);

test("MSE-25.177 offers copy stays limited to published offer facts", () => {
  assert.match(source, /Offres publiées/);
  assert.match(source, /offres actuellement publiées/);
  assert.doesNotMatch(source, /offres sélectionnées par votre agence/i);
  assert.doesNotMatch(source, /meilleures opportunités/i);
  assert.doesNotMatch(source, /adapté à votre projet/i);
});

test("MSE-25.177 does not invent quote actions for offers without href", () => {
  assert.match(source, /const resolvedHref = resolvePublicCtaHref\(site, item\?\.href, ""\)/);
  assert.match(source, /\{resolvedHref \? \(/);
  assert.doesNotMatch(source, /Demander un devis pour/);
});

test("MSE-25.177 preserves explicit prices without inventing starting-price semantics", () => {
  assert.match(source, /Prix publié : \{item\.price\}/);
  assert.doesNotMatch(source, /À partir de \{item\.price\}/);
});

test("MSE-25.177 related navigation uses published pages only", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /RELATED_OFFER_PAGE_SLUGS/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /\{page\.title\}/);
  assert.doesNotMatch(source, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(source, /`\$\{root\}\/services`/);
  assert.doesNotMatch(source, /`\$\{root\}\/contact`/);
});

test("MSE-25.177 empty offers state is factual", () => {
  assert.match(source, /Aucune offre n’est actuellement publiée dans cette section/);
  assert.doesNotMatch(source, /prochaines offres arrivent bientôt/i);
});
