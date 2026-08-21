import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

function assertPendingOrFinalized(id, backlog, catalogue) {
  const pending = new RegExp(`id:\\s*"${id}"[^\\n]*state:\\s*"source-pending"`).test(backlog);
  const finalized = new RegExp(`P\\("${id}"[^\\n]*"\\/partners\\/(?:manual\\/)?${id}\\.(?:svg|webp)"\\)`).test(catalogue);
  assert.ok(pending || finalized, `${id} should be pending or finalized`);
}

function assertPermissionOrFinalized(id, backlog, catalogue) {
  const pendingPermission = new RegExp(`id:\\s*"${id}"[^\\n]*state:\\s*"permission-required"`).test(backlog);
  const finalized = new RegExp(`P\\("${id}"[^\\n]*"\\/partners\\/(?:manual\\/)?${id}\\.(?:svg|webp)"\\)`).test(catalogue);
  assert.ok(pendingPermission || finalized, `${id} should be permission-held or finalized from an accepted asset`);
}

test("partner logo sourcing keeps vetted assets separate from press and permission reviews", () => {
  const cruiseSources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const cruiseDetails = read("components/page-builder/shared/partnerCruiseDetails.js");
  const circuitSources = read("components/page-builder/shared/partnerCircuitLogoSources.js");
  const staySources = read("components/page-builder/shared/partnerStayLogoSources.js");
  const longHaulSources = read("components/page-builder/shared/partnerLongHaulLogoSources.js");
  const franceEuropeSources = read("components/page-builder/shared/partnerFranceEuropeLogoSources.js");
  const stayDetails = read("components/page-builder/shared/partnerStayDetails.js");
  const franceEuropeDetails = read("components/page-builder/shared/partnerFranceEuropeDetails.js");
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const verification = read("components/page-builder/shared/partnerVerification.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const queue = read("scripts/partner-logo-work-queue.mjs");
  const discovery = read("scripts/partner-logo-source-discovery.mjs");
  const acquisition = read("scripts/partner-logo-acquire.mjs");
  const coverage = read("scripts/partner-logo-coverage.mjs");
  const registryAudit = read("scripts/partner-logo-source-registry-audit.mjs");
  const packageJson = read("package.json");
  const assetTest = read("test/mse-25-partner-assets.test.mjs");

  assert.match(cruiseSources, /"catlante-catamarans"/);
  assert.match(cruiseSources, /status:\s*"vetted-source"/);
  assert.match(cruiseSources, /catlante-catamarans\.svg/);
  assert.match(cruiseSources, /croisieurope[\s\S]*official-press-room/);
  assert.match(cruiseSources, /rivages-du-monde[\s\S]*official-source-page/);
  assert.match(cruiseSources, /explora-journeys[\s\S]*official-press-kit/);
  assert.match(cruiseSources, /hurtigruten[\s\S]*official-press-library/);
  assert.match(cruiseSources, /cfc[\s\S]*permission-review/);
  assert.match(cruiseDetails, /rivages-du-monde[\s\S]*Croisière fluviale[\s\S]*Expédition/);

  assert.match(circuitSources, /double-sens[\s\S]*official-site/);
  assert.match(circuitSources, /la-francaise-des-circuits[\s\S]*official-site/);
  assert.match(circuitSources, /salaun-holidays[\s\S]*permission-review/);
  assert.match(circuitSources, /nordiska[\s\S]*permission-review/);
  assert.match(circuitSources, /pouchkine-tours[\s\S]*permission-review/);
  assert.doesNotMatch(circuitSources, /visit-europe/);
  assert.match(circuitSources, /getCircuitLogoSource/);

  assert.match(staySources, /belambra[\s\S]*permission-review/);
  assert.match(staySources, /boomerang[\s\S]*official-source-page/);
  assert.match(staySources, /"jet-tours"[\s\S]*official-source-page/);
  assert.match(staySources, /"plein-vent"[\s\S]*permission-review/);
  assert.match(staySources, /mondial-tourisme[\s\S]*permission-review/);
  assert.match(staySources, /"travel-evasion"[\s\S]*official-source-page/);
  assert.match(staySources, /heliades[\s\S]*permission-review/);
  assert.match(staySources, /voyamar[\s\S]*permission-review/);
  assert.match(staySources, /getStayLogoSource/);

  assert.match(longHaulSources, /alma-latina[\s\S]*official-source-page/);
  assert.doesNotMatch(longHaulSources, /planete-production/);
  assert.doesNotMatch(longHaulSources, /ollandini/);
  assert.doesNotMatch(longHaulSources, /travel-evasion/);

  assert.match(franceEuropeSources, /campings-com[\s\S]*official-source-page/);
  assert.match(franceEuropeSources, /ollandini[\s\S]*official-source-page/);
  assert.match(franceEuropeSources, /pierre-vacances-center-parcs[\s\S]*multi-brand-review/);
  assert.match(franceEuropeSources, /"pierre-vacances"[\s\S]*source-pending/);
  assert.match(franceEuropeSources, /"center-parcs"[\s\S]*source-pending/);
  assert.match(franceEuropeSources, /maeva[\s\S]*source-pending/);
  assert.match(franceEuropeDetails, /pierre-vacances-center-parcs[\s\S]*displayMode:\s*"brand-cluster"/);

  for (const id of ["rivages-du-monde", "travel-evasion", "ollandini", "croisieurope", "destination-aventure", "top-of-travel"]) {
    assertPendingOrFinalized(id, backlog, catalogue);
  }
  for (const id of ["belambra", "mondial-tourisme", "plein-vent", "heliades", "voyamar", "salaun-holidays", "nordiska", "pouchkine-tours", "cfc", "celestyal-cruises", "ponant"]) {
    assert.match(verification, new RegExp(`${id}[\\s\\S]*asset-permission-review`));
    assertPermissionOrFinalized(id, backlog, catalogue);
  }

  assert.match(catalogue, /P\("ovoyages",\s*"Ôvoyages",\s*"sejours"/);
  assert.doesNotMatch(catalogue, /visit-europe|planete-production|worldia|aerosun|mega-vacances/i);
  assert.match(stayDetails, /ovoyages[\s\S]*Club vacances/);

  assert.match(queue, /official-individual-assets-webp-or-vetted-svg/);
  assert.match(queue, /acceptedFormats:\s*\["webp", "svg"\]/);
  assert.match(discovery, /discover-classify-no-write/);
  assert.match(acquisition, /requiredState:\s*"source-vetted"/);
  assert.match(coverage, /individual-assets-only-publishable-partners/);
  assert.match(registryAudit, /catalogue-backlog-source-registry-consistency/);
  assert.match(assetTest, /\(\?:webp\|svg\)/);
});
