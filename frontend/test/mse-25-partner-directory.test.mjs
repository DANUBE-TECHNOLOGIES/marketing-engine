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
  const assetCoverage = read("components/page-builder/shared/partnerAssetCoverage.js");
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
