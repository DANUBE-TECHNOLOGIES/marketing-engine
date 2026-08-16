import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("full partner directory exposes the network categories and supplier inventory", () => {
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const details = read("components/page-builder/shared/partnerDetails.js");
  const cruiseDetails = read("components/page-builder/shared/partnerCruiseDetails.js");
  const circuitDetails = read("components/page-builder/shared/partnerCircuitDetails.js");
  const stayDetails = read("components/page-builder/shared/partnerStayDetails.js");
  const longHaulDetails = read("components/page-builder/shared/partnerLongHaulDetails.js");
  const franceEuropeDetails = read("components/page-builder/shared/partnerFranceEuropeDetails.js");
  const assetCoverage = read("components/page-builder/shared/partnerAssetCoverage.js");
  const logoBacklog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const renderer = read("components/public-site/renderers/PartnerDirectoryRenderer.js");
  const registry = read("components/public-site/renderers/registry.js");
  const blockCatalogue = read("lib/page-builder-v2/block-catalog.js");

  for (const category of ["croisieres", "circuits", "sejours", "sur-mesure", "france-europe"]) {
    assert.match(catalogue, new RegExp(`id: "${category}"`));
  }

  for (const supplier of [
    "Catlante Catamarans",
    "CroisiEurope",
    "Ponant",
    "Hurtigruten",
    "MSC Croisières",
    "Costa Croisières",
    "FRAM",
    "TUI France",
    "Club Med",
    "Exotismes",
    "Asia",
    "Austral Lagons",
    "KUONI",
    "Salaün Holidays",
    "Worldia",
    "Thalasso N°1",
  ]) {
    assert.match(catalogue, new RegExp(supplier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const enrichedId of [
    "top-of-travel",
    "visit-europe",
    "voyages-internationaux",
    "boomerang",
    "mondial-tourisme",
    "la-francaise-des-circuits",
    "pacha-tours",
    "kuoni",
    "ollandini",
    "mmv",
  ]) {
    assert.match(details, new RegExp(`(?:^|\\n)\\s*"?${enrichedId}"?\\s*:`));
  }

  assert.match(cruiseDetails, /"catlante-catamarans"/);
  assert.match(cruiseDetails, /cfc:/);
  assert.match(cruiseDetails, /Croisière à la cabine/);
  assert.match(cruiseDetails, /Départ de Marseille/);
  assert.match(renderer, /getCruisePartnerDetails/);

  assert.match(circuitDetails, /"destination-aventure"/);
  assert.match(circuitDetails, /nordiska:/);
  assert.match(circuitDetails, /Trek & randonnée/);
  assert.match(circuitDetails, /Voyage Signature/);
  assert.match(circuitDetails, /Circuit accompagné/);
  assert.match(circuitDetails, /Laponie/);
  assert.match(renderer, /getCircuitPartnerDetails/);

  assert.match(stayDetails, /belambra:/);
  assert.match(stayDetails, /voyamar:/);
  assert.match(stayDetails, /Club vacances/);
  assert.match(stayDetails, /Naya Club/);
  assert.match(stayDetails, /Pension complète/);
  assert.match(stayDetails, /Circuit privatif/);
  assert.match(renderer, /getStayPartnerDetails/);

  assert.match(longHaulDetails, /"alma-latina"/);
  assert.match(longHaulDetails, /"australie-tours"/);
  assert.match(longHaulDetails, /"climats-du-monde"/);
  assert.match(longHaulDetails, /"jetset-voyages"/);
  assert.match(longHaulDetails, /"luxair-tours"/);
  assert.match(longHaulDetails, /Voyage sur mesure/);
  assert.match(renderer, /getLongHaulPartnerDetails/);

  assert.match(franceEuropeDetails, /"campings-com"/);
  assert.match(franceEuropeDetails, /lagrange:/);
  assert.match(franceEuropeDetails, /mmv:/);
  assert.match(franceEuropeDetails, /"pierre-vacances-center-parcs"/);
  assert.match(franceEuropeDetails, /odalys:/);
  assert.match(franceEuropeDetails, /"thalasso-n1"/);
  assert.match(franceEuropeDetails, /"villages-clubs-soleil"/);
  assert.match(renderer, /getFranceEuropePartnerDetails/);

  assert.match(catalogue, /\/partners\/kuoni-official\.webp/);
  assert.match(details, /Top Clubs/);
  assert.match(details, /Kappa Club/);
  assert.match(details, /Mondi Club/);
  assert.match(details, /Voyage en train/);
  assert.match(details, /Circuit accompagné/);
  assert.match(details, /Circuit privatif/);
  assert.match(details, /Méditerranée orientale/);
  assert.match(details, /Alpes françaises/);

  assert.match(assetCoverage, /policy: "individual-assets-only"/);
  assert.match(assetCoverage, /fallback: "initials"/);
  assert.match(assetCoverage, /noSprite: true/);
  assert.match(assetCoverage, /missingLogo/);
  assert.doesNotMatch(assetCoverage, /common-partners-sprite/);

  assert.match(logoBacklog, /"ponant"/);
  assert.match(logoBacklog, /"celestyal-cruises"/);
  assert.match(logoBacklog, /permission-required/);
  assert.match(logoBacklog, /official-press-request/);
  assert.match(logoBacklog, /brand-permission/);
  assert.match(logoBacklog, /"destination-aventure"/);
  assert.match(logoBacklog, /"nordiska"/);
  assert.match(logoBacklog, /"pouchkine-tours"/);
  assert.match(logoBacklog, /"belambra"/);
  assert.match(logoBacklog, /"voyamar"/);
  assert.match(logoBacklog, /"aerosun"/);
  assert.match(logoBacklog, /"alma-latina"/);
  assert.match(logoBacklog, /"australie-tours"/);
  assert.match(logoBacklog, /"campings-com"/);
  assert.match(logoBacklog, /"pierre-vacances-center-parcs"/);
  assert.match(logoBacklog, /"villages-clubs-soleil"/);
  assert.match(logoBacklog, /verification-pending/);

  assert.match(renderer, /getPartnerDirectoryCategories/);
  assert.match(renderer, /categoryNav/);
  assert.match(renderer, /partner\.summary/);
  assert.match(renderer, /partner\.tags\.slice\(0, 2\)/);
  assert.match(renderer, /<details className=\{styles\.details\}>/);
  assert.match(renderer, /Découvrir ses spécialités/);
  assert.match(renderer, /getPartnerDetails/);
  assert.match(registry, /"partner-directory":\s*PartnerDirectoryRenderer/);
  assert.match(blockCatalogue, /type: "partner-directory"/);
  assert.match(blockCatalogue, /singleton: true/);
});
