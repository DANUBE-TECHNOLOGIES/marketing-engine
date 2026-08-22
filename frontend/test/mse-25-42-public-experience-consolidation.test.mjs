import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
function read(relative) { return fs.readFileSync(path.join(ROOT, relative), "utf8"); }

const api = read("lib/public-site-api.js");
const heroCss = read("components/public-site/hero-finish.css");
const destinations = read("components/public-site/renderers/DestinationsRenderer.js");
const features = read("components/public-site/renderers/FeaturesV2Renderer.js");
const inspirations = read("components/public-site/renderers/InspirationsRenderer.js");
const team = read("components/public-site/renderers/TeamRenderer.js");
const teamCss = read("components/public-site/renderers/TeamRenderer.module.css");
const partners = read("components/public-site/renderers/PartnersRenderer.js");
const partnersCss = read("components/public-site/renderers/PartnersRenderer.module.css");
const contact = read("components/public-site/renderers/ContactRenderer.js");
const hours = read("components/public-site/renderers/HoursRenderer.js");
const map = read("components/public-site/renderers/MapRenderer.js");
const tree = read("../backend/src/modules/agency-site/templates/default-tree.js");
const sections = read("../backend/src/modules/agency-site/templates/section-definitions.js");

function assertCanonicalInspirationsLink(source) {
  assert.match(source, /\/inspirations/);
  assert.doesNotMatch(source, /\$\{root\}\/inspiration["`]/);
  assert.doesNotMatch(source, /siteHref\(site,\s*"inspiration"\)/);
}

test("MSE-25.42 keeps V2 PageBlocks canonical and home ordering in memory", () => {
  assert.match(api, /if \(blocks\.length\)/);
  assert.match(api, /presentationOrder:\s*rank \* 1000 \+ tieBreaker/);
  assert.match(api, /destinations:\s*20/);
  assert.match(api, /flexible_payment:\s*30/);
  assert.match(api, /services:\s*40/);
  assert.match(api, /team:\s*50/);
  assert.match(api, /reviews:\s*60/);
});

test("MSE-25.42 keeps the immersive home hero and compact secondary hero", () => {
  assert.match(heroCss, /public-site-hero--home/);
  assert.match(heroCss, /public-site-hero--inner/);
  assert.match(heroCss, /width:68%/);
  assert.match(heroCss, /width:42%/);
  assert.match(heroCss, /min-height:clamp\(300px,25vw,390px\)/);
  assert.match(heroCss, /@media\(max-width:760px\)/);
});

test("MSE-25.42 destination cards preserve hydrated imagery and local navigation", () => {
  assert.match(destinations, /item\.imageUrl/);
  assert.match(destinations, /item\.heroImage/);
  assert.match(destinations, /public-site-destination-card-image/);
  assert.match(destinations, /public-site-related-links/);
  assertCanonicalInspirationsLink(destinations);
});

test("MSE-25.42 services use premium cards and canonical secondary routes", () => {
  assert.match(features, /public-site-feature-card/);
  assert.match(features, /resolvedTargetCities/);
  assert.match(features, /public-site-related-links/);
  assertCanonicalInspirationsLink(features);
});

test("MSE-25.42 inspirations expose editorial cards and link back to commercial pages", () => {
  assert.match(inspirations, /public-site-editorial-grid/);
  assert.match(inspirations, /public-site-editorial-card/);
  assert.match(inspirations, /\/destinations/);
  assert.match(inspirations, /\/services/);
  assert.match(inspirations, /\/contact/);
});

test("MSE-25.42 team page renders actual advisor media with adaptive single-member composition", () => {
  assert.match(team, /member\.imageUrl/);
  assert.match(team, /member\.photoUrl/);
  assert.match(team, /const singleMember=uniqueMembers\.length===1/);
  assert.match(team, /styles\.single/);
  assert.match(teamCss, /\.single\{grid-template-columns:minmax\(0,820px\)\}/);
  assert.match(teamCss, /\.single \.card\{display:grid;grid-template-columns:250px minmax\(0,1fr\)/);
});

test("MSE-25.42 partners restore both network logos and the complete specialist catalogue", () => {
  assert.match(partners, /getCommonPartners/);
  assert.match(partners, /FULL_PARTNERS/);
  assert.match(partners, /PARTNER_DIRECTORY_CATEGORIES/);
  assert.match(partners, /getPublishablePartnerProfiles/);
  assert.match(partners, /PartnerDirectory/);
  assert.match(partnersCss, /\.directoryGrid/);
  assert.match(partnersCss, /\.networkGrid/);
});

test("MSE-25.42 secondary partner and team pages inherit useful Home content only when needed", () => {
  assert.match(api, /partenaires:\s*Object\.freeze/);
  assert.match(api, /family:\s*"partners"/);
  assert.match(api, /equipe:\s*Object\.freeze/);
  assert.match(api, /family:\s*"team"/);
  assert.match(api, /services:\s*Object\.freeze/);
  assert.match(api, /destinations:\s*Object\.freeze/);
});

test("MSE-25.42 contact, map and hours provide a connected local conversion path", () => {
  assert.match(contact, /resolvedTargetCities/);
  assert.match(contact, /public-site-agency-profile/);
  assertCanonicalInspirationsLink(contact);
  assert.match(map, /google\.com\/maps\/search/);
  assert.match(map, /Calculer l’itinéraire/);
  assert.match(map, /\/equipe/);
  assert.match(hours, /getPublicHours/);
  assert.match(hours, /public-site-hours-status-card/);
  assert.match(hours, /\/contact/);
});

test("MSE-25.42 canonical page tree uses the plural inspirations route", () => {
  assert.match(tree, /slug:\s*"inspirations"/);
  assert.doesNotMatch(tree, /slug:\s*"inspiration"/);
});

test("MSE-25.42 generated TEAM and PARTNERS pages contain their real public renderers", () => {
  assert.match(sections, /TEAM:\s*\["page-header",\s*"team-introduction",\s*"team"/);
  assert.match(sections, /PARTNERS:\s*\["page-header",\s*"partners-introduction",\s*"partner-directory"/);
});
