import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const publicRoot = path.join(frontendRoot, "public");

async function loadCatalogue() {
  const source = fs.readFileSync(path.join(frontendRoot, "components/page-builder/shared/fullPartners.js"), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

test("every declared partner logo resolves to an individual public asset", async () => {
  const { FULL_PARTNERS } = await loadCatalogue();
  const declared = FULL_PARTNERS.filter((partner) => partner.logoUrl);
  assert.ok(declared.length >= 7, "le socle réseau doit conserver ses logos validés");

  for (const partner of declared) {
    assert.match(partner.logoUrl, /^\/partners\/(?:manual\/)?[a-z0-9][a-z0-9-]*\.(?:webp|svg)$/);
    assert.doesNotMatch(partner.logoUrl, /sprite/i);
    const filePath = path.join(publicRoot, partner.logoUrl.slice(1));
    assert.equal(fs.existsSync(filePath), true, `${partner.name}: asset manquant ${partner.logoUrl}`);
    assert.ok(fs.statSync(filePath).size > 100, `${partner.name}: asset vide ou invalide`);
    if (partner.logoUrl.endsWith(".svg")) {
      const svg = fs.readFileSync(filePath, "utf8");
      assert.match(svg, /<svg\b/i, `${partner.name}: contenu SVG invalide`);
    }
  }
});

test("missing logos remain explicit fallbacks instead of broken image references", async () => {
  const { FULL_PARTNERS } = await loadCatalogue();
  const missing = FULL_PARTNERS.filter((partner) => !partner.logoUrl);
  assert.ok(missing.length > 0);
  for (const partner of missing) assert.equal(partner.logoUrl, "");
});

test("permission-gated assets remain held unless an accepted user-supplied asset is present", async () => {
  const { FULL_PARTNERS } = await loadCatalogue();
  const coverageSource = fs.readFileSync(path.join(frontendRoot, "components/page-builder/shared/partnerAssetCoverage.js"), "utf8");
  const backlogSource = fs.readFileSync(path.join(frontendRoot, "components/page-builder/shared/partnerLogoBacklog.js"), "utf8");

  assert.match(coverageSource, /policy: "individual-assets-only"/);
  assert.match(coverageSource, /fallback: "initials"/);
  assert.match(coverageSource, /permission-required/);
  assert.match(coverageSource, /verification-pending/);

  const protectedIds = ["ponant", "celestyal-cruises", "salaun-holidays", "belambra", "plein-vent", "heliades", "voyamar"];
  for (const id of protectedIds) {
    const partner = FULL_PARTNERS.find((candidate) => candidate.id === id);
    assert.ok(partner, `${id}: partenaire absent du catalogue`);
    const acceptedManualAsset = partner.logoUrl === `/partners/manual/${id}.webp`;
    const stillHeld = new RegExp(`id: "${id}"[^\\n]*state: "permission-required"`).test(backlogSource) && partner.logoUrl === "";
    assert.ok(acceptedManualAsset || stillHeld, `${id}: permission hold or accepted manual asset expected`);
  }
});
