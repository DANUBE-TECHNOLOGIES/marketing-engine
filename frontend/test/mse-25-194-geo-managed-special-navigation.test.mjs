import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const header = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteHeader.js"),
  "utf8",
);

const hero = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/HeroV2Renderer.js"),
  "utf8",
);

const groupsRoute = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/voyages-en-groupe/page.js"),
  "utf8",
);

const businessRoute = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/business-travel/page.js"),
  "utf8",
);

test("MSE-25.194 restores only the two explicitly managed special navigation routes", () => {
  assert.match(header, /const MANAGED_SPECIAL_NAVIGATION = Object\.freeze\(\[/);
  assert.match(header, /title: "Groupes", slug: "voyages-en-groupe"/);
  assert.match(header, /title: "Voyages d’affaires", slug: "business-travel"/);
  assert.match(header, /function managedSpecialNavigation\(siteSlug\)/);
  assert.match(header, /href: `\/agence\/\$\{siteSlug\}\/\$\{item\.slug\}`/);
  assert.ok(groupsRoute.length > 0);
  assert.ok(businessRoute.length > 0);
});

test("MSE-25.194 keeps published navigation grounded while appending managed routes explicitly", () => {
  assert.match(header, /const published = uniquePublishedNavigation\(site\)\.map/);
  assert.match(header, /provenance: "published"/);
  assert.match(header, /const managed = managedSpecialNavigation\(site\.slug\)/);
  assert.match(header, /provenance: "managed"/);
  assert.match(header, /const seen = new Set\(published\.map\(\(item\) => item\.href\)\)/);
  assert.match(header, /\.filter\(\(item\) => !seen\.has\(item\.href\)\)/);
  assert.doesNotMatch(header, /slugify|titleToSlug|labelToSlug/i);
});

test("MSE-25.194 manages Construire mon voyage to Contact with an explicit href", () => {
  assert.match(hero, /const MANAGED_HOME_CONTACT_CTA = Object\.freeze\(\{/);
  assert.match(hero, /label: "Construire mon voyage"/);
  assert.match(hero, /href: "\/contact"/);
  assert.match(hero, /return configuredHeroCta\(site, MANAGED_HOME_CONTACT_CTA\)/);
  assert.match(hero, /if \(!isHomePage\(page\)\) return null/);
});

test("MSE-25.194 does not restore label-derived hero routing", () => {
  assert.match(hero, /const explicitHref = String\(cta\?\.href \|\| ""\)\.trim\(\)/);
  assert.match(hero, /if \(!label \|\| !explicitHref\) return null/);
  assert.match(hero, /const configuredPrimaryCta = configuredHeroCta\(site, content\.primaryCta\)/);
  assert.match(hero, /configuredPrimaryCta \|\| managedHomeContactCta\(site, page\)/);
  assert.doesNotMatch(hero, /content\.primaryButton/);
  assert.doesNotMatch(hero, /resolvePublicCtaHref\(site, .*label/i);
});
