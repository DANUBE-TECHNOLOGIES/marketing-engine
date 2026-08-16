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

const [{ FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES }, logoBacklogModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerLogoBacklog.js"),
]);

const detailModules = await Promise.all([
  loadModule("partnerDetails.js"),
  loadModule("partnerCruiseDetails.js"),
  loadModule("partnerCircuitDetails.js"),
  loadModule("partnerStayDetails.js"),
  loadModule("partnerLongHaulDetails.js"),
  loadModule("partnerFranceEuropeDetails.js"),
]);

const getters = detailModules
  .flatMap((module) => Object.entries(module))
  .filter(([name, value]) => /^get.*PartnerDetails$/.test(name) && typeof value === "function")
  .map(([, value]) => value);

const categories = new Set(PARTNER_DIRECTORY_CATEGORIES.map((item) => item.id));
const backlog = Array.isArray(logoBacklogModule.PARTNER_LOGO_BACKLOG)
  ? logoBacklogModule.PARTNER_LOGO_BACKLOG
  : [];
const backlogIds = new Set(backlog.map((item) => item.id));

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const duplicateValues = (values) => {
  const seen = new Map();
  for (const value of values) {
    const key = normalize(value);
    if (!key) continue;
    seen.set(key, [...(seen.get(key) || []), value]);
  }
  return [...seen.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({ key, values: rows }));
};

const rows = FULL_PARTNERS.map((partner) => {
  const detail = getters.map((getter) => getter(partner.id)).find(Boolean) || null;
  const summaryLength = String(partner.summary || "").trim().length;
  const tagCount = Array.isArray(partner.tags) ? partner.tags.length : 0;

  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    hasLogo: Boolean(String(partner.logoUrl || "").trim()),
    hasDetails: Boolean(detail),
    hasLogoBacklog: backlogIds.has(partner.id),
    summaryLength,
    tagCount,
    warnings: [
      !categories.has(partner.category) ? "unknown-category" : null,
      summaryLength < 70 ? "summary-too-short" : null,
      summaryLength > 220 ? "summary-too-long" : null,
      tagCount < 2 ? "not-enough-tags" : null,
      tagCount > 3 ? "too-many-tags" : null,
      !detail ? "details-missing" : null,
      !partner.logoUrl && !backlogIds.has(partner.id) ? "logo-not-tracked" : null,
    ].filter(Boolean),
  };
});

const structuralErrors = {
  duplicateIds: duplicateValues(FULL_PARTNERS.map((partner) => partner.id)),
  duplicateNames: duplicateValues(FULL_PARTNERS.map((partner) => partner.name)),
  unknownCategories: rows.filter((row) => row.warnings.includes("unknown-category")),
};

const editorialWarnings = rows.filter((row) => row.warnings.length);
const byCategory = Object.fromEntries(
  [...categories].map((category) => {
    const categoryRows = rows.filter((row) => row.category === category);
    return [category, {
      total: categoryRows.length,
      withLogo: categoryRows.filter((row) => row.hasLogo).length,
      withDetails: categoryRows.filter((row) => row.hasDetails).length,
      warnings: categoryRows.reduce((sum, row) => sum + row.warnings.length, 0),
    }];
  })
);

const payload = {
  policy: {
    publicUx: "simple-first-progressive-details",
    logos: "individual-assets-only",
    maxVisibleTags: 2,
  },
  summary: {
    partners: rows.length,
    categories: categories.size,
    withDetails: rows.filter((row) => row.hasDetails).length,
    withLogo: rows.filter((row) => row.hasLogo).length,
    trackedMissingLogos: rows.filter((row) => !row.hasLogo && row.hasLogoBacklog).length,
    editorialWarnings: editorialWarnings.length,
  },
  structuralErrors,
  byCategory,
  editorialWarnings,
};

console.log(JSON.stringify(payload, null, 2));

if (
  structuralErrors.duplicateIds.length ||
  structuralErrors.duplicateNames.length ||
  structuralErrors.unknownCategories.length
) {
  process.exitCode = 2;
}
