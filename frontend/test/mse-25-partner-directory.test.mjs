import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("full partner directory exposes categorized supplier inventory with complete public editorial profiles", () => {
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const fallbackDetails = read("components/page-builder/shared/partnerDetails.js");
  const cruiseDetails = read("components/page-builder/shared/partnerCruiseDetails.js");
  const circuitDetails = read("components/page-builder/shared/partnerCircuitDetails.js");
  const stayDetails = read("components/page-builder/shared/partnerStayDetails.js");
  const longHaulDetails = read("components/page-builder/shared/partnerLongHaulDetails.js");
  const franceEuropeDetails = read("components/page-builder/shared/partnerFranceEuropeDetails.js");
  const profile = read("components/page-builder/shared/partnerProfile.js");
  const verification = read("components/page-builder/shared/partnerVerification.js");
  const assetCoverage = read("components/page-builder/shared/partnerAssetCoverage.js");
  const logoBacklog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const renderer = read("components/public-site/renderers/PartnerDirectoryRenderer.js");
  const rendererCss = read("components/public-site/renderers/PartnerDirectoryRenderer.module.css");
  const publicRegistry = read("components/public-site/renderers/registry.js");
  const previewRegistry = read("components/page-builder/blockRegistry.js");
  const previewRenderer = read("components/page-builder/blocks/PartnerCategoriesBlock.js");
  const blockCatalogue = read("lib/page-builder-v2/block-catalog.js");

  for (const category of ["croisieres", "circuits", "sejours", "sur-mesure", "france-europe"]) assert.match(catalogue, new RegExp(`id: "${category}"`));
  for (const supplier of ["Catlante Catamarans", "CroisiEurope", "Rivages du Monde", "Ponant", "Hurtigruten", "MSC Croisières", "Costa Croisières", "FRAM", "TUI France", "Club Med", "Exotismes", "Jet tours", "Plein Vent", "Solea", "Travel Evasion", "Asia", "Austral Lagons", "KUONI", "Salaün Holidays", "Ollandini", "Thalasso N°1"]) {
    assert.match(catalogue, new RegExp(supplier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const excluded of ["Worldia", "Aerosun", "Mega Vacances"]) assert.doesNotMatch(catalogue, new RegExp(excluded, "i"));

  assert.match(fallbackDetails, /const DETAILS = Object\.freeze\(\{\}\)/);

  for (const id of ["catlante-catamarans", "croisieurope", "rivages-du-monde", "ponant", "celestyal-cruises", "explora-journeys", "cfc", "hurtigruten", "msc-croisieres", "costa-croisieres"]) {
    assert.match(cruiseDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  }
  assert.match(cruiseDetails, /Croisière à la cabine/);
  assert.match(cruiseDetails, /Croisière culturelle/);
  assert.match(cruiseDetails, /Départ de Marseille/);

  for (const id of ["double-sens", "destination-aventure", "la-francaise-des-circuits", "salaun-holidays", "pouchkine-tours", "nordiska", "top-of-travel", "visit-europe", "voyages-internationaux", "rev-vacances"]) {
    assert.match(circuitDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  }
  assert.doesNotMatch(circuitDetails, /(?:^|\n)\s*worldia\s*:/i);
  assert.match(circuitDetails, /Trek & randonnée/);
  assert.match(circuitDetails, /Voyage Signature/);
  assert.match(circuitDetails, /Voyage en train/);

  for (const id of ["fram", "tui-france", "club-med", "belambra", "boomerang", "exotismes", "jet-tours", "hotels-lagons", "lmx-voyages", "mondial-tourisme", "plein-vent", "solea", "pacha-tours", "heliades", "voyamar", "travel-evasion"]) {
    assert.match(stayDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  }
  for (const term of [/Club Framissima/, /Kappa Club/, /Mondi Club/, /Club Jumbo/, /Méditerranée orientale/, /Naya Club/, /Croisière sur le Nil/]) assert.match(stayDetails, term);

  for (const id of ["alma-latina", "australie-tours", "amerigo", "beachcomber-tours", "asia", "austral-lagons", "climats-du-monde", "jetset-voyages", "luxair-tours", "gaeland-ashling", "planete-production", "kuoni"]) {
    assert.match(longHaulDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  }
  assert.doesNotMatch(longHaulDetails, /(?:^|\n)\s*ollandini\s*:/i);
  assert.doesNotMatch(longHaulDetails, /(?:^|\n)\s*worldia\s*:/i);

  for (const id of ["campings-com", "lagrange", "mmv", "pierre-vacances-center-parcs", "ollandini", "odalys", "thalasso-n1", "villages-clubs-soleil"]) {
    assert.match(franceEuropeDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  }
  assert.match(franceEuropeDetails, /Spécialiste|Corse/);

  for (const resolver of ["getCruisePartnerDetails", "getCircuitPartnerDetails", "getStayPartnerDetails", "getLongHaulPartnerDetails", "getFranceEuropePartnerDetails"]) assert.match(profile, new RegExp(resolver));
  assert.match(profile, /getResolvedPartnerDetails/);
  assert.match(profile, /getPublishablePartnerProfiles/);
  assert.match(profile, /readyForPublication/);
  assert.match(profile, /visibleTags:\s*Array\.isArray\(partner\.tags\) \? partner\.tags\.slice\(0, 2\)/);
  assert.match(verification, /asiam[\s\S]*identity-review/);

  assert.match(catalogue, /\/partners\/kuoni-official\.webp/);
  assert.match(assetCoverage, /policy: "individual-assets-only"/);
  assert.match(assetCoverage, /fallback: "initials"/);
  assert.match(assetCoverage, /noSprite: true/);
  assert.match(assetCoverage, /missingLogo/);
  assert.doesNotMatch(assetCoverage, /common-partners-sprite/);
  for (const id of ["ponant", "celestyal-cruises", "destination-aventure", "nordiska", "pouchkine-tours", "belambra", "voyamar", "alma-latina", "australie-tours", "campings-com", "pierre-vacances-center-parcs", "villages-clubs-soleil", "rivages-du-monde"]) {
    assert.match(logoBacklog, new RegExp(`"${id}"`));
  }
  for (const excluded of ["worldia", "aerosun", "mega-vacances"]) assert.doesNotMatch(logoBacklog, new RegExp(`"${excluded}"`));

  assert.match(renderer, /getPartnerDirectoryCategories/);
  assert.match(renderer, /getPartnerProfile/);
  assert.match(renderer, /getPublishablePartnerProfiles/);
  assert.match(renderer, /Découvrir ses spécialités/);
  assert.match(renderer, /Destinations/);
  assert.match(renderer, /Types de voyages/);
  assert.match(renderer, /Site du partenaire/);
  assert.match(rendererCss, /grid-template-columns: repeat\(3/);
  assert.match(rendererCss, /@media \(max-width: 720px\)/);

  assert.match(publicRegistry, /"partner-directory":\s*PartnerDirectoryRenderer/);
  assert.match(previewRegistry, /registerBlock\("partner-categories", PartnerCategoriesBlock\)/);
  assert.match(previewRenderer, /PARTNER_DIRECTORY_CATEGORIES/);
  assert.match(previewRenderer, /isPartnerPublicationConfirmed/);
  assert.match(previewRenderer, /Destinations et types de voyages/);
  assert.match(blockCatalogue, /type: "partner-directory"/);
  assert.match(blockCatalogue, /singleton: true/);
});
