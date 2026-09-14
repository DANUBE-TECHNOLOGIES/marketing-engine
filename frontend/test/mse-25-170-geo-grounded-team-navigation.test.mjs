import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/TeamRenderer.js"),
  "utf8",
);

const journey = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicContextualJourney.js"),
  "utf8",
);

test("MSE-25.170 team navigation reuses the published navigation resolver", () => {
  assert.match(source, /contextualJourneyItems/);
  assert.match(source, /contextualJourneyItems\(site, page\?\.slug, 3\)/);
  assert.match(journey, /uniquePublishedNavigation\(site\)/);
});

test("MSE-25.170 team renderer receives the current public page and avoids fixed route claims", () => {
  assert.match(source, /TeamRenderer\(\{ section, site, page \}\)/);
  assert.doesNotMatch(source, /siteHref\(site, "services"\)/);
  assert.doesNotMatch(source, /siteHref\(site, "destinations"\)/);
  assert.doesNotMatch(source, /siteHref\(site, "contact"\)/);
});

test("MSE-25.170 visible links use published page titles and hrefs only", () => {
  assert.match(source, /navigationItems\.map\(\(item\) =>/);
  assert.match(source, /href=\{item\.href\}>\{item\.title\}/);
  assert.match(source, /Pages publiées par l’agence/);
  assert.doesNotMatch(source, /Découvrir nos services|Explorer nos destinations|Échanger avec un conseiller/);
});

test("MSE-25.170 keeps team navigation non transactional", () => {
  assert.doesNotMatch(source, /Réserver|Disponibilité|Prix à partir|Acheter maintenant/i);
});
