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

const [{ FULL_PARTNERS }, verificationModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerVerification.js"),
]);
const getPartnerVerification = verificationModule.getPartnerVerification;

const CATEGORY_SOURCE = Object.freeze({
  croisieres: "cruise",
  circuits: "circuit",
  sejours: "stay",
  "sur-mesure": "long-haul",
  "france-europe": "france-europe",
});

const modules = [
  ["cruise", "partnerCruiseDetails.js"],
  ["circuit", "partnerCircuitDetails.js"],
  ["stay", "partnerStayDetails.js"],
  ["long-haul", "partnerLongHaulDetails.js"],
  ["france-europe", "partnerFranceEuropeDetails.js"],
];

const loaded = await Promise.all(modules.map(async ([sourceName, fileName]) => {
  const module = await loadModule(fileName);
  const getter = Object.entries(module).find(([name, value]) => /^get.*PartnerDetails$/.test(name) && typeof value === "function")?.[1];
  return { sourceName, fileName, getter };
}));

const rows = FULL_PARTNERS.map((partner) => {
  const verification = getPartnerVerification(partner.id);
  const sources = loaded
    .filter(({ getter }) => getter?.(partner.id))
    .map(({ sourceName, fileName }) => ({ sourceName, fileName }));
  const expectedSource = CATEGORY_SOURCE[partner.category] || null;
  return { id: partner.id, name: partner.name, category: partner.category, expectedSource, verificationStatus: verification.status, sources };
});

const duplicates = rows.filter((row) => row.sources.length > 1);
const missing = rows.filter((row) => row.sources.length === 0);
const missingConfirmed = missing.filter((row) => row.verificationStatus !== "identity-review");
const heldForIdentityReview = missing.filter((row) => row.verificationStatus === "identity-review");
const categoryMismatches = rows.filter((row) =>
  row.sources.length === 1 && row.expectedSource && row.sources[0].sourceName !== row.expectedSource
);

console.log(JSON.stringify({
  policy: "one-category-aligned-specialized-source-per-confirmed-partner",
  summary: {
    total: rows.length,
    singleSource: rows.filter((row) => row.sources.length === 1).length,
    duplicateSources: duplicates.length,
    missingSources: missing.length,
    missingConfirmed: missingConfirmed.length,
    heldForIdentityReview: heldForIdentityReview.length,
    categoryMismatches: categoryMismatches.length,
  },
  duplicates,
  categoryMismatches,
  missingConfirmed,
  heldForIdentityReview,
}, null, 2));

if (duplicates.length || missingConfirmed.length || categoryMismatches.length) process.exitCode = 2;
