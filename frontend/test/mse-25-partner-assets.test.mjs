import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const publicRoot = path.join(frontendRoot, "public");

async function loadCatalogue() {
  const source = fs.readFileSync(
    path.join(frontendRoot, "components/page-builder/shared/fullPartners.js"),
    "utf8"
  );
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

async function loadAssetCoverage() {
  return import(
    pathToFileURL(
      path.join(frontendRoot, "components/page-builder/shared/partnerAssetCoverage.js")
    ).href
  );
}

test("every declared partner logo resolves to an individual public asset", async () => {
  const { FULL_PARTNERS } = await loadCatalogue();
  const declared = FULL_PARTNERS.filter((partner) => partner.logoUrl);

  assert.ok(declared.length > 0);

  for (const partner of declared) {
    assert.match(partner.logoUrl, /^\/partners\/[a-z0-9][a-z0-9-]*\.(?:webp|svg)$/);
    assert.doesNotMatch(partner.logoUrl, /sprite/i);

    const filePath = path.join(publicRoot, partner.logoUrl.slice(1));
    assert.equal(
      fs.existsSync(filePath),
      true,
      `${partner.name}: asset manquant ${partner.logoUrl}`
    );
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
  for (const partner of missing) {
    assert.equal(partner.logoUrl, "");
  }
});

test("partner asset coverage never promotes pending or permission-blocked logos", async () => {
  const { getPartnerAssetCoverage, PARTNER_ASSET_COVERAGE } = await loadAssetCoverage();
  const coverage = getPartnerAssetCoverage();

  assert.equal(PARTNER_ASSET_COVERAGE.policy, "individual-assets-only");
  assert.equal(PARTNER_ASSET_COVERAGE.fallback, "initials");
  assert.equal(PARTNER_ASSET_COVERAGE.noSprite, true);
  assert.equal(coverage.covered + coverage.missing, coverage.total);
  assert.equal(coverage.fallbackCount, coverage.missing);
  assert.equal(coverage.safeToRender, true);
  assert.ok(coverage.covered >= 7, "le socle réseau doit conserver ses logos validés");
  assert.ok(coverage.permissionBlocked.length > 0, "les logos soumis à autorisation doivent rester identifiés");
  assert.ok(coverage.sourcePending.length > 0, "le backlog doit conserver les sources encore à valider");

  for (const partner of [...coverage.permissionBlocked, ...coverage.sourcePending]) {
    assert.equal(partner.logoUrl, "", `${partner.name}: un logo non validé ne doit pas être activé`);
  }
});
