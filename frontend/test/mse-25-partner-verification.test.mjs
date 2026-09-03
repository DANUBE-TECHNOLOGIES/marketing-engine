import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("partner verification distinguishes identity review from logo permission review", () => {
  const verification = read("components/page-builder/shared/partnerVerification.js");
  const audit = read("scripts/partner-catalog-quality.mjs");
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const longHaul = read("components/page-builder/shared/partnerLongHaulDetails.js");
  const longHaulSources = read("components/page-builder/shared/partnerLongHaulLogoSources.js");
  const stayDetails = read("components/page-builder/shared/partnerStayDetails.js");
  const staySources = read("components/page-builder/shared/partnerStayLogoSources.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");

  assert.match(verification, /asiam[\s\S]*identity-review/);

  for (const id of ["mega-vacances", "worldia", "aerosun"]) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.doesNotMatch(catalogue, new RegExp(`P\\("${escaped}"`));
    assert.doesNotMatch(backlog, new RegExp(`id:\\s*"${escaped}"`));
  }
  assert.doesNotMatch(catalogue, /Mega Vacances/);
  assert.doesNotMatch(backlog, /Mega Vacances/);

  // Keep explicit defensive exclusions for brands that must not be reintroduced.
  assert.match(verification, /worldia[\s\S]*status:\s*"catalogue-excluded"/);
  assert.match(verification, /aerosun[\s\S]*status:\s*"catalogue-excluded"/);

  for (const id of ["hotels-lagons", "lmx-voyages", "travel-evasion"]) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.doesNotMatch(verification, new RegExp(`"?${escaped}"?\\s*:[\\s\\S]*?identity-review`));
    assert.match(stayDetails, new RegExp(`"?${escaped}"?\\s*:`));
    assert.match(staySources, new RegExp(`"?${escaped}"?\\s*:[\\s\\S]*?official-source-page`));
  }

  assert.match(catalogue, /P\("travel-evasion",\s*"Travel Evasion",\s*"sejours"/);
  assert.doesNotMatch(catalogue, /P\("travel-evasion",\s*"Travel Evasion",\s*"sur-mesure"/);
  assert.match(backlog, /travel-evasion[\s\S]*category:\s*"sejours"[\s\S]*state:\s*"source-pending"/);

  for (const id of ["amerigo", "gaeland-ashling", "planete-production"]) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.doesNotMatch(verification, new RegExp(`"?${escaped}"?\\s*:[\\s\\S]*?identity-review`));
    assert.match(longHaul, new RegExp(`"?${escaped}"?\\s*:`));
    assert.match(longHaulSources, new RegExp(`"?${escaped}"?\\s*:[\\s\\S]*?official-source-page`));
  }

  assert.match(verification, /status: "identity-review"/);

  for (const id of [
    "ponant",
    "celestyal-cruises",
    "cfc",
    "salaun-holidays",
    "nordiska",
    "pouchkine-tours",
  ]) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(verification, new RegExp(`"?${escaped}"?:[\\s\\S]*?status: "asset-permission-review"`));
  }

  assert.match(verification, /status: "confirmed"/);
  assert.match(verification, /isPartnerPublicationConfirmed/);

  assert.match(audit, /identity: "confirm-before-final-publication"/);
  assert.match(audit, /verificationStatus/);
  assert.match(audit, /identityReview/);
  assert.match(audit, /assetPermissionReview/);
  assert.match(audit, /publicationConfirmed/);
});
