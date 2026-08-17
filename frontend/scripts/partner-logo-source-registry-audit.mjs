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

const [
  catalogueModule,
  verificationModule,
  backlogModule,
  cruiseModule,
  circuitModule,
  stayModule,
  longHaulModule,
  franceEuropeModule,
] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerVerification.js"),
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerCruiseLogoSources.js"),
  loadModule("partnerCircuitLogoSources.js"),
  loadModule("partnerStayLogoSources.js"),
  loadModule("partnerLongHaulLogoSources.js"),
  loadModule("partnerFranceEuropeLogoSources.js"),
]);

const catalogue = Array.isArray(catalogueModule.FULL_PARTNERS) ? catalogueModule.FULL_PARTNERS : [];
const catalogueById = new Map(catalogue.map((partner) => [partner.id, partner]));
const backlog = Array.isArray(backlogModule.PARTNER_LOGO_BACKLOG) ? backlogModule.PARTNER_LOGO_BACKLOG : [];
const backlogById = new Map(backlog.map((item) => [item.id, item]));
const getPartnerVerification = verificationModule.getPartnerVerification;

const registries = [
  ["croisieres", cruiseModule.PARTNER_CRUISE_LOGO_SOURCES || {}],
  ["circuits", circuitModule.PARTNER_CIRCUIT_LOGO_SOURCES || {}],
  ["sejours", stayModule.PARTNER_STAY_LOGO_SOURCES || {}],
  ["sur-mesure", longHaulModule.PARTNER_LONG_HAUL_LOGO_SOURCES || {}],
  ["france-europe", franceEuropeModule.PARTNER_FRANCE_EUROPE_LOGO_SOURCES || {}],
];

const issues = [];
const registryIds = new Set();

for (const [expectedCategory, registry] of registries) {
  for (const [id, source] of Object.entries(registry)) {
    registryIds.add(id);
    const partner = catalogueById.get(id);
    if (!partner) {
      issues.push({ type: "orphan-source-registry-entry", id, expectedCategory });
      continue;
    }
    if (partner.category !== expectedCategory) {
      issues.push({
        type: "source-registry-category-mismatch",
        id,
        expectedCategory,
        catalogueCategory: partner.category,
      });
    }

    const status = String(source?.status || "").trim();
    if (!status) issues.push({ type: "missing-source-status", id });
  }
}

for (const item of backlog) {
  const partner = catalogueById.get(item.id);
  if (!partner) {
    issues.push({ type: "orphan-backlog-entry", id: item.id, category: item.category });
    continue;
  }
  if (partner.category !== item.category) {
    issues.push({
      type: "backlog-category-mismatch",
      id: item.id,
      backlogCategory: item.category,
      catalogueCategory: partner.category,
    });
  }
}

for (const partner of catalogue) {
  const verification = getPartnerVerification(partner.id);
  const logoUrl = String(partner.logoUrl || "").trim();
  if (logoUrl || verification.status === "identity-review" || verification.status === "catalogue-excluded") continue;

  const backlogItem = backlogById.get(partner.id);
  if (!backlogItem) {
    issues.push({ type: "missing-logo-backlog", id: partner.id, category: partner.category });
    continue;
  }

  if (verification.status === "asset-permission-review" || backlogItem.state === "permission-required") continue;
  if (!registryIds.has(partner.id)) {
    issues.push({ type: "missing-logo-source-registry", id: partner.id, category: partner.category });
  }

  if (backlogItem.state === "source-vetted") {
    const registry = registries.find(([category]) => category === partner.category)?.[1] || {};
    const source = registry[partner.id] || null;
    const directSource = source?.preferredSource || source?.assetUrl || "";
    if (!directSource) {
      issues.push({ type: "vetted-backlog-without-direct-source", id: partner.id });
    }
  }
}

const payload = {
  ok: issues.length === 0,
  policy: "catalogue-backlog-source-registry-consistency",
  summary: {
    cataloguePartners: catalogue.length,
    backlogEntries: backlog.length,
    sourceRegistryEntries: registryIds.size,
    issues: issues.length,
  },
  issues,
};

console.log(JSON.stringify(payload, null, 2));
if (issues.length) process.exitCode = 2;
