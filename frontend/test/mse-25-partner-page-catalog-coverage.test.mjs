import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [{ FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES }, verificationModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerVerification.js"),
]);
const detailModules = await Promise.all([
  loadModule("partnerCruiseDetails.js"),
  loadModule("partnerCircuitDetails.js"),
  loadModule("partnerStayDetails.js"),
  loadModule("partnerLongHaulDetails.js"),
  loadModule("partnerFranceEuropeDetails.js"),
]);
const detailGetters = detailModules
  .flatMap((module) => Object.entries(module))
  .filter(([name, value]) => /^get.*PartnerDetails$/.test(name) && typeof value === "function")
  .map(([, value]) => value);

function detailsFor(partnerId) {
  return detailGetters.map((getter) => getter(partnerId)).find(Boolean) || null;
}

function contentReady(partner) {
  const verification = verificationModule.getPartnerVerification(partner.id);
  if (["identity-review", "catalogue-excluded"].includes(verification.status)) return false;
  const details = detailsFor(partner.id);
  const summary = String(partner.summary || "").trim();
  const tags = Array.isArray(partner.tags) ? partner.tags.filter(Boolean) : [];
  const destinations = Array.isArray(details?.destinations) ? details.destinations.filter(Boolean) : [];
  const travelTypes = Array.isArray(details?.travelTypes) ? details.travelTypes.filter(Boolean) : [];
  return summary.length >= 45 && tags.length >= 2 && destinations.length >= 2 && travelTypes.length >= 2;
}

test("public partner page catalogue keeps expected network coverage", () => {
  assert.equal(PARTNER_DIRECTORY_CATEGORIES.length, 5);
  assert.equal(FULL_PARTNERS.length, 57);

  const counts = Object.fromEntries(
    PARTNER_DIRECTORY_CATEGORIES.map((category) => [
      category.id,
      FULL_PARTNERS.filter((partner) => partner.category === category.id).length,
    ])
  );
  assert.deepEqual(counts, {
    croisieres: 10,
    circuits: 10,
    sejours: 16,
    "sur-mesure": 13,
    "france-europe": 8,
  });

  const blockedByIdentity = FULL_PARTNERS.filter(
    (partner) => verificationModule.getPartnerVerification(partner.id).status === "identity-review"
  );
  assert.deepEqual(blockedByIdentity.map((partner) => partner.id), ["asiam"]);

  const ready = FULL_PARTNERS.filter(contentReady);
  assert.equal(ready.length, 56);
  assert.equal(ready.some((partner) => partner.id === "asiam"), false);
});
