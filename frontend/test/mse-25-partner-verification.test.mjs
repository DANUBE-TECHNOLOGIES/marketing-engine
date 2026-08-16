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
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const circuitDetails = read("components/page-builder/shared/partnerCircuitDetails.js");
  const circuitLogoSources = read("components/page-builder/shared/partnerCircuitLogoSources.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const audit = read("scripts/partner-catalog-quality.mjs");

  for (const id of [
    "hotels-lagons",
    "lmx-voyages",
    "mega-vacances",
    "aerosun",
    "amerigo",
    "asiam",
    "gaeland-ashling",
    "planete-production",
    "travel-evasion",
  ]) {
    assert.match(verification, new RegExp(`"?${id}"?\\s*:`));
  }

  assert.doesNotMatch(verification, /"rev-vacances"\s*:\s*\{[\s\S]*?identity-review/);
  assert.match(catalogue, /P\("rev-vacances",\s*"Rev'Vacances",\s*"circuits"/);
  assert.match(circuitDetails, /"rev-vacances"[\s\S]*rev-vacances\.fr/);
  assert.match(circuitLogoSources, /"rev-vacances"[\s\S]*official-source-page/);
  assert.match(backlog, /rev-vacances[\s\S]*category:\s*"circuits"[\s\S]*source-pending/);

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
