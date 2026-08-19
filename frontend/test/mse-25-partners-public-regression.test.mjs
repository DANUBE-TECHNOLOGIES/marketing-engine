import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("public partner renderer is backed by the canonical network catalogue", () => {
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");
  const catalogue = read("components/page-builder/shared/commonPartners.js");
  const registry = read("components/public-site/renderers/registry.js");

  assert.match(renderer, /getCommonPartners/);
  assert.match(renderer, /item\.group === "tui"/);
  assert.match(registry, /logos:\s*PartnersRenderer/);
  assert.match(registry, /partners:\s*PartnersRenderer/);
  assert.match(registry, /"partner-logos":\s*PartnersRenderer/);

  for (const expected of [
    'id: "fram"',
    'id: "tui-univers"',
    'id: "club-med"',
    'id: "msc-croisieres"',
    'id: "costa-croisieres"',
    'id: "kuoni"',
    'id: "exotismes"',
  ]) {
    assert.match(catalogue, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(catalogue, /salaun/i);
  assert.doesNotMatch(catalogue, /common-partners-sprite/i);
});

test("Website Designer exposes at most three agency-specific partners", () => {
  const editor = read("components/page-builder-v2/BlockListEditors.js");
  const builder = read("components/page-builder-v2/VisualPageBuilder.js");
  const catalogue = read("lib/page-builder-v2/block-catalog.js");
  const state = read("lib/page-builder-v2/page-builder-state.js");
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");

  assert.match(editor, /export function PartnerLogosEditor/);
  assert.match(editor, /maxAgencyPartners = 3/);
  assert.match(editor, /getCommonPartners\(\)/);
  assert.match(editor, /logoAssetId/);
  assert.match(editor, /Lien facultatif/);

  assert.match(builder, /PartnerLogosEditor/);
  assert.match(builder, /block\.type === "partner-logos"/);
  assert.match(builder, /agencyPartners=\{content\.agencyPartners\}/);

  assert.match(catalogue, /type: "partner-logos"/);
  assert.match(catalogue, /agencyPartners: \[\]/);
  assert.match(catalogue, /maxAgencyPartners: 3/);

  assert.match(state, /\["logos", "partners", "partner-logos"\]/);
  assert.match(state, /return "partner-logos"/);

  assert.match(renderer, /selectAgencyPartners\(candidates/);
  assert.match(renderer, /max:\s*Number\(content\.maxAgencyPartners\) \|\| 3/);
});

test("Website Designer agency partner slots prefer verified canonical partners with a custom fallback", () => {
  const editor = read("components/page-builder-v2/BlockListEditors.js");

  assert.match(editor, /FULL_PARTNERS/);
  assert.match(editor, /PARTNER_DIRECTORY_CATEGORIES/);
  assert.match(editor, /getPartnerProfile/);
  assert.match(editor, /partner\?\.publishable && partner\?\.readyForPublication/);
  assert.match(editor, /canonicalAgencyPartnerOptions/);
  assert.match(editor, /catalogPartnerId/);
  assert.match(editor, /source: "catalog"/);
  assert.match(editor, /source: "custom"/);
  assert.match(editor, /Partenaire du catalogue Mondescale/);
  assert.match(editor, /Partenaire personnalisé/);
  assert.match(editor, /selectedElsewhere\.has\(partner\.id\)/);
  assert.match(editor, /disabled=\{selectedElsewhere\.has\(partner\.id\)\}/);
  assert.match(editor, /canonicalPartnerValue/);
  assert.match(editor, /logoUrl: partner\.logoUrl/);
  assert.match(editor, /summary: partner\.summary/);
  assert.match(editor, /tags: \[\.\.\.partner\.tags\]/);
});

test("catalogue-backed agency partners are rehydrated from verified source before public rendering", () => {
  const resolver = read("components/page-builder/shared/agencyPartnerCatalog.js");
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");

  assert.match(resolver, /FULL_PARTNERS/);
  assert.match(resolver, /getPartnerProfile/);
  assert.match(resolver, /partner\?\.publishable && partner\?\.readyForPublication/);
  assert.match(resolver, /export function resolveAgencyPartnerCandidates/);
  assert.match(resolver, /const catalogPartnerId = text\(item\.catalogPartnerId\)/);
  assert.match(resolver, /const partner = canonical\.get\(catalogPartnerId\)/);
  assert.match(resolver, /if \(!partner\) continue/);
  assert.match(resolver, /name: partner\.name/);
  assert.match(resolver, /logoUrl: partner\.logoUrl \|\| ""/);
  assert.match(resolver, /source: "catalog"/);
  assert.match(resolver, /source: "custom"/);

  assert.match(renderer, /resolveAgencyPartnerCandidates\(content\.agencyPartners\)/);
  assert.match(renderer, /selectAgencyPartners\(candidates/);
});

test("public agency partner selection is deterministic, deduplicated and URL-safe", () => {
  const selection = read("components/page-builder/shared/partnerSelection.js");
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");
  const directory = read("components/public-site/renderers/PartnerDirectoryRenderer.js");

  assert.match(selection, /NETWORK_PARTNER_ALIASES/);
  assert.match(selection, /"tui-france"/);
  assert.match(selection, /"club-lookea"/);
  assert.match(selection, /export function selectAgencyPartners/);
  assert.match(selection, /Math\.min\(3,/);
  assert.match(selection, /reserved\.has\(id\) \|\| reserved\.has\(nameKey\)/);
  assert.match(selection, /seen\.has\(id\) \|\| seen\.has\(nameKey\)/);
  assert.match(selection, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
  assert.match(selection, /scope: "agency"/);

  assert.match(renderer, /safePartnerAssetUrl/);
  assert.match(renderer, /selectAgencyPartners/);
  assert.doesNotMatch(renderer, /function safePartnerHref/);

  assert.match(directory, /safePartnerHref\(profile\.details\?\.website, \{ allowInternal: false \}\)/);
  assert.match(directory, /rel="noopener noreferrer"/);
});

test("public minisite proxy exposes partner assets", () => {
  const proxy = read("proxy.js");
  assert.match(proxy, /pathname === "\/partners"/);
  assert.match(proxy, /pathname\.startsWith\("\/partners\/"\)/);
});
