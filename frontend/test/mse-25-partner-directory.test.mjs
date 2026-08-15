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
    "Salaün Holidays",
    "Worldia",
    "Thalasso N°1",
  ]) {
    assert.match(catalogue, new RegExp(supplier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(renderer, /getPartnerDirectoryCategories/);
  assert.match(renderer, /categoryNav/);
  assert.match(renderer, /partner\.summary/);
  assert.match(renderer, /partner\.tags/);
  assert.match(registry, /"partner-directory":\s*PartnerDirectoryRenderer/);
  assert.match(blockCatalogue, /type: "partner-directory"/);
  assert.match(blockCatalogue, /singleton: true/);
});
