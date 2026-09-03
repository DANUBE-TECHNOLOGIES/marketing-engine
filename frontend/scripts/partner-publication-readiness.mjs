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

const getPartnerVerification = verificationModule.getPartnerVerification;
const strict = process.argv.includes("--strict-content=true");

function resolveDetails(partnerId) {
  return detailGetters.map((getter) => getter(partnerId)).find(Boolean) || null;
}

function toReadiness(partner) {
  const details = resolveDetails(partner.id);
  const verification = getPartnerVerification(partner.id);
  const summaryLength = String(partner.summary || "").trim().length;
  const tags = Array.isArray(partner.tags) ? partner.tags.filter(Boolean) : [];
  const destinations = Array.isArray(details?.destinations) ? details.destinations.filter(Boolean) : [];
  const travelTypes = Array.isArray(details?.travelTypes) ? details.travelTypes.filter(Boolean) : [];
  const hasLogo = Boolean(String(partner.logoUrl || "").trim());
  const identityConfirmed = verification.status !== "identity-review";

  const score =
    (identityConfirmed ? 30 : 0) +
    (summaryLength >= 45 ? 20 : 0) +
    (tags.length >= 2 ? 10 : 0) +
    (destinations.length >= 2 && travelTypes.length >= 2 ? 25 : 0) +
    (hasLogo ? 15 : 0);

  const blockers = [
    !identityConfirmed ? "identity-review" : null,
    summaryLength < 45 ? "summary" : null,
    tags.length < 2 ? "tags" : null,
    destinations.length < 2 ? "destinations" : null,
    travelTypes.length < 2 ? "travel-types" : null,
  ].filter(Boolean);

  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    score,
    status: blockers.length ? "needs-content" : hasLogo ? "ready" : "ready-with-logo-fallback",
    hasLogo,
    verificationStatus: verification.status,
    blockers,
  };
}

const rows = FULL_PARTNERS.map(toReadiness)
  .sort((a, b) => a.score - b.score || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const payload = {
  policy: "content-first-logo-fallback-allowed",
  summary: {
    total: rows.length,
    ready: rows.filter((row) => row.status === "ready").length,
    readyWithLogoFallback: rows.filter((row) => row.status === "ready-with-logo-fallback").length,
    needsContent: rows.filter((row) => row.status === "needs-content").length,
    identityReview: rows.filter((row) => row.verificationStatus === "identity-review").length,
  },
  backlog: rows.filter((row) => row.status === "needs-content"),
  publishable: rows.filter((row) => row.status !== "needs-content"),
};

console.log(JSON.stringify(payload, null, 2));

if (strict && payload.backlog.some((row) => row.verificationStatus !== "identity-review")) {
  process.exitCode = 2;
}
