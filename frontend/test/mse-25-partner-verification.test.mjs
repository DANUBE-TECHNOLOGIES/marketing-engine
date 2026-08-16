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
    "rev-vacances",
  ]) {
    assert.match(verification, new RegExp(`"?${id}"?\\s*:`));
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
