import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteFooter.js"),
  "utf8",
);

test("MSE-25.173 footer copy stays factual and avoids generic commercial promises", () => {
  assert.match(source, /Retrouvez les coordonnées publiques et les contenus publiés par votre agence de voyages/);
  assert.match(source, /Coordonnées et contenus publiés par l’agence/);
  assert.doesNotMatch(source, /voyages uniques, adaptés à vos envies/);
  assert.doesNotMatch(source, /accompagnement personnalisé/i);
  assert.doesNotMatch(source, /Destinations conseillées/);
});

test("MSE-25.173 footer navigation reuses canonical published navigation", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /publishedFooterPages\(site\)/);
  assert.match(source, /href=\{pageHref\(site\.slug, page\)\}/);
  assert.match(source, /\{page\.title\}/);
});

test("MSE-25.173 footer no longer invents an inspiration route", () => {
  assert.doesNotMatch(source, /<Link href=\{`\$\{basePath\}\/inspiration`\}>/);
  assert.match(source, /FOOTER_PUBLIC_PAGE_SLUGS/);
  assert.match(source, /"inspiration"/);
});

test("MSE-25.173 preserves canonical agency NAP semantics", () => {
  assert.match(source, /itemType="https:\/\/schema\.org\/TravelAgency"/);
  assert.match(source, /itemProp="address"/);
  assert.match(source, /itemProp="telephone"/);
  assert.match(source, /itemProp="email"/);
  assert.match(source, /#travel-agency/);
});
