import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const headerSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/PublicSiteHeader.js"),
  "utf8",
);
const localContextSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/LocalContentContext.js"),
  "utf8",
);
const heroSource = fs.readFileSync(
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

test("MSE-25.194 restores the two explicit managed commercial routes using real app paths", () => {
  assert.match(headerSource, /slug: "business-travel", title: "Voyages d’affaires"/);
  assert.match(headerSource, /slug: "voyages-en-groupe", title: "Groupes"/);
  assert.match(headerSource, /const MANAGED_PUBLIC_ROUTES = Object\.freeze/);
  assert.ok(groupsRoute.length > 0);
  assert.ok(businessRoute.length > 0);
});

test("MSE-25.194 keeps CMS publication provenance strict while extending public navigation", () => {
  assert.match(headerSource, /function uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /function uniquePublicNavigation\(site\)/);
  assert.match(headerSource, /const published = uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /return \[\.\.\.published, \.\.\.managed\]/);
  assert.match(headerSource, /const publishedPages = uniquePublishedNavigation\(site\)/);
  assert.match(headerSource, /const pages = uniquePublicNavigation\(site\)/);
  assert.match(headerSource, /publishedPageBySlug\(publishedPages, "contact"\)/);
});

test("MSE-25.194 exposes grounded public navigation in local context without reviving generic fabricated routes", () => {
  assert.match(localContextSource, /uniquePublicNavigation\(site\)/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/services`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(localContextSource, /`\$\{root\}\/contact`/);
});

test("MSE-25.194 keeps managed route deduplication slug based", () => {
  assert.match(headerSource, /new Set\(published\.map\(\(page\) => pageSlug\(page\) \|\| "__home__"\)\)/);
  assert.match(headerSource, /if \(!slug \|\| seen\.has\(slug\)\) return false/);
  assert.match(headerSource, /seen\.add\(slug\)/);
  assert.doesNotMatch(headerSource, /slugify|titleToSlug|labelToSlug/i);
});

test("MSE-25.194 manages Construire mon voyage through the explicit quote-route authority", () => {
  assert.match(heroSource, /const MANAGED_HOME_CONTACT_CTA = Object\.freeze\(\{/);
  assert.match(heroSource, /label: "Construire mon voyage"/);
  assert.match(heroSource, /quoteSource: "general"/);
  assert.match(heroSource, /href: quoteRequestHref\(site, \{ source: MANAGED_HOME_CONTACT_CTA\.quoteSource \}\)/);
  assert.match(heroSource, /if \(!isHomePage\(page\)\) return null/);
  assert.match(heroSource, /configuredPrimaryCta \|\| managedHomeContactCta\(site, page\)/);
});

test("MSE-25.194 permits only managed quote intent to derive a hero route", () => {
  assert.match(heroSource, /if \(!label\) return null/);
  assert.match(heroSource, /if \(projectCtaLabel\(label\)\) return \{ label, href: quoteRequestHref\(site, \{ source: "general" \}\) \}/);
  assert.match(heroSource, /const explicitHref = String\(cta\?\.href \|\| ""\)\.trim\(\)/);
  assert.match(heroSource, /if \(!explicitHref\) return null/);
  assert.match(heroSource, /resolvePublicCtaHref\(site, explicitHref, ""\)/);
  assert.doesNotMatch(heroSource, /content\.primaryButton/);
  assert.doesNotMatch(heroSource, /resolvePublicCtaHref\(site, .*label/i);
});
