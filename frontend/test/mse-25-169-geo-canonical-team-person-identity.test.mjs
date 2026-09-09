import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/TeamRenderer.js"),
  "utf8",
);

const publicRoute = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/[[...pageSlug]]/page.js"),
  "utf8",
);

test("MSE-25.169 Person ids are anchored to the canonical agency root", () => {
  assert.match(source, /return `\$\{absoluteUrl\(siteRoot\(site\)\)\}#person-\$\{encodeURIComponent\(rawKey\)\}`/);
  assert.doesNotMatch(source, /absoluteUrl\(`\$\{siteRoot\(site\)\}\/equipe`\)/);
});

test("MSE-25.169 Person identity does not depend on a dedicated equipe route", () => {
  assert.match(publicRoute, /return publicSiteApi\.getPage\(siteSlug, slug\)/);
  assert.doesNotMatch(publicRoute, /equipe.*mandatory|mandatory.*equipe/i);
});

test("MSE-25.169 keeps Person to TravelAgency linkage unchanged", () => {
  assert.match(source, /#travel-agency/);
  assert.match(source, /itemProp="worksFor"/);
  assert.match(source, /itemID=\{agencyId\}/);
  assert.match(source, /itemType="https:\/\/schema\.org\/TravelAgency"/);
});

test("MSE-25.169 does not add inferred expertise or commercial authority", () => {
  assert.doesNotMatch(source, /itemProp="knowsAbout"/);
  assert.doesNotMatch(source, /itemProp="hasCredential"/);
  assert.doesNotMatch(source, /itemProp="price"|itemProp="availability"/i);
});
