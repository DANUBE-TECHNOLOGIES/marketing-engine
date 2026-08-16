import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("full partner directory exposes categorized supplier inventory with specialized editorial sources", () => {
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const fallbackDetails = read("components/page-builder/shared/partnerDetails.js");
  const cruiseDetails = read("components/page-builder/shared/partnerCruiseDetails.js");
  const circuitDetails = read("components/page-builder/shared/partnerCircuitDetails.js");
  const stayDetails = read("components/page-builder/shared/partnerStayDetails.js");
  const longHaulDetails = read("components/page-builder/shared/partnerLongHaulDetails.js");
  const franceEuropeDetails = read("components/page-builder/shared/partnerFranceEuropeDetails.js");
  const profile = read("components/page-builder/shared/partnerProfile.js");
  const assetCoverage = read("components/page-builder/shared/partnerAssetCoverage.js");
  const logoBacklog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const renderer = read("components/public-site/renderers/PartnerDirectoryRenderer.js");
  const registry = read("components/public-site/renderers/registry.js");
  const blockCatalogue = read("lib/page-builder-v2/block-catalog.js");

  for (const category of ["croisieres", "circuits", "sejours", "sur-mesure", "france-europe"]) assert.match(catalogue, new RegExp(`id: "${category}"`));
  for (const supplier of ["Catlante Catamarans", "CroisiEurope", "Ponant", "Hurtigruten", "MSC Croisières", "Costa Croisières", "FRAM", "TUI France", "Club Med", "Exotismes", "Asia", "Austral Lagons", "KUONI", "Salaün Holidays", "Worldia", "Thalasso N°1"]) assert.match(catalogue, new RegExp(supplier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(fallbackDetails, /const DETAILS = Object\.freeze\(\{\}\)/);

  for (const id of ["catlante-catamarans", "croisieurope", "ponant", "celestyal-cruises", "explora-journeys", "cfc", "hurtigruten", "msc-croisieres", "costa-croisieres"]) assert.match(cruiseDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  assert.match(cruiseDetails, /Croisière à la cabine/); assert.match(cruiseDetails, /Départ de Marseille/);

  for (const id of ["double-sens", "destination-aventure", "la-francaise-des-circuits", "salaun-holidays", "nordiska", "top-of-travel", "visit-europe", "voyages-internationaux"]) assert.match(circuitDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  assert.match(circuitDetails, /Trek & randonnée/); assert.match(circuitDetails, /Voyage Signature/); assert.match(circuitDetails, /Voyage en train/);

  for (const id of ["fram", "tui-france", "club-med", "belambra", "boomerang", "exotismes", "mondial-tourisme", "plein-vent", "solea", "pacha-tours", "heliades", "voyamar"]) assert.match(stayDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  for (const term of [/Club Framissima/, /Kappa Club/, /Mondi Club/, /Club Jumbo/, /Méditerranée orientale/, /Naya Club/]) assert.match(stayDetails, term);

  for (const id of ["alma-latina", "australie-tours", "beachcomber-tours", "asia", "austral-lagons", "climats-du-monde", "jetset-voyages", "luxair-tours", "kuoni", "worldia", "ollandini"]) assert.match(longHaulDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));
  for (const id of ["campings-com", "lagrange", "mmv", "pierre-vacances-center-parcs", "odalys", "thalasso-n1", "villages-clubs-soleil"]) assert.match(franceEuropeDetails, new RegExp(`(?:^|\\n)\\s*"?${id}"?\\s*:`));

  for (const resolver of ["getPartnerDetails", "getCruisePartnerDetails", "getCircuitPartnerDetails", "getStayPartnerDetails", "getLongHaulPartnerDetails", "getFranceEuropePartnerDetails"]) assert.match(profile, new RegExp(resolver));
  assert.match(profile, /getResolvedPartnerDetails/); assert.match(profile, /getPublishablePartnerProfiles/); assert.match(profile, /identityConfirmed/); assert.match(profile, /visibleTags:\s*Array\.isArray\(partner\.tags\) \? partner\.tags\.slice\(0, 2\)/);

  assert.match(catalogue, /\/partners\/kuoni-official\.webp/);
  assert.match(assetCoverage, /policy: "individual-assets-only"/); assert.match(assetCoverage, /fallback: "initials"/); assert.match(assetCoverage, /noSprite: true/); assert.match(assetCoverage, /missingLogo/); assert.doesNotMatch(assetCoverage, /common-partners-sprite/);
  for (const id of ["ponant", "celestyal-cruises", "destination-aventure", "nordiska", "pouchkine-tours", "belambra", "voyamar", "aerosun", "alma-latina", "australie-tours", "campings-com", "pierre-vacances-center-parcs", "villages-clubs-soleil"]) assert.match(logoBacklog, new RegExp(`"${id}"`));
  assert.match(logoBacklog, /permission-required/); assert.match(logoBacklog, /verification-pending/);

  assert.match(renderer, /getPartnerDirectoryCategories/); assert.match(renderer, /getPartnerProfile/); assert.match(renderer, /getPublishablePartnerProfiles/); assert.match(renderer, /Découvrir ses spécialités/);
  assert.match(registry, /"partner-directory":\s*PartnerDirectoryRenderer/); assert.match(blockCatalogue, /type: "partner-directory"/); assert.match(blockCatalogue, /singleton: true/);
});
