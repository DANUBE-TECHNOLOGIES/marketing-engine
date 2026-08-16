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
  { FULL_PARTNERS, PARTNER_DIRECTORY_CATEGORIES },
  logoBacklogModule,
  verificationModule,
] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerVerification.js"),
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

const getPartnerVerification = typeof verificationModule.getPartnerVerification === "function"
  ? verificationModule.getPartnerVerification
  : () => ({ status: "confirmed" });

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
  const destinations = Array.isArray(detail?.destinations) ? detail.destinations.filter(Boolean) : [];
  const travelTypes = Array.isArray(detail?.travelTypes) ? detail.travelTypes.filter(Boolean) : [];
  const verification = getPartnerVerification(partner.id);
  const hasLogo = Boolean(String(partner.logoUrl || "").trim());
  const identityConfirmed = verification.status !== "identity-review";
  const contentReady = identityConfirmed && summaryLength >= 45 && tagCount >= 2 && destinations.length >= 2 && travelTypes.length >= 2;
  const assetReady = hasLogo || verification.status === "asset-permission-review";
  const completenessScore =
    (identityConfirmed ? 30 : 0) +
    (summaryLength >= 45 ? 20 : 0) +
    (tagCount >= 2 ? 10 : 0) +
    (destinations.length >= 2 && travelTypes.length >= 2 ? 25 : 0) +
    (hasLogo ? 15 : 0);

  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    verificationStatus: verification.status,
    verificationReason: verification.reason || null,
    hasLogo,
    hasDetails: Boolean(detail),
    contentReady,
    assetReady,
    readyForPublication: contentReady,
    completenessScore,
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
      verification.status === "identity-review" ? "identity-review" : null,
      verification.status === "asset-permission-review" ? "asset-permission-review" : null,
    ].filter(Boolean),
  };
});

const structuralErrors = {
  duplicateIds: duplicateValues(FULL_PARTNERS.map((partner) => partner.id)),
  duplicateNames: duplicateValues(FULL_PARTNERS.map((partner) => partner.name)),
  unknownCategories: rows.filter((row) => row.warnings.includes("unknown-category")),
};

const editorialWarnings = rows.filter((row) => row.warnings.length);
const identityReview = rows.filter((row) => row.verificationStatus === "identity-review");
const assetPermissionReview = rows.filter((row) => row.verificationStatus === "asset-permission-review");
const publicationConfirmed = rows.filter((row) => row.verificationStatus !== "identity-review");
const contentReady = rows.filter((row) => row.contentReady);
const needsContent = rows.filter((row) => !row.contentReady);

const byCategory = Object.fromEntries(
  [...categories].map((category) => {
    const categoryRows = rows.filter((row) => row.category === category);
    return [category, {
      total: categoryRows.length,
      withLogo: categoryRows.filter((row) => row.hasLogo).length,
      withDetails: categoryRows.filter((row) => row.hasDetails).length,
      contentReady: categoryRows.filter((row) => row.contentReady).length,
      assetReady: categoryRows.filter((row) => row.assetReady).length,
      averageCompletenessScore: categoryRows.length
        ? Math.round(categoryRows.reduce((sum, row) => sum + row.completenessScore, 0) / categoryRows.length)
        : 100,
      publicationConfirmed: categoryRows.filter((row) => row.verificationStatus !== "identity-review").length,
      identityReview: categoryRows.filter((row) => row.verificationStatus === "identity-review").length,
      assetPermissionReview: categoryRows.filter((row) => row.verificationStatus === "asset-permission-review").length,
      warnings: categoryRows.reduce((sum, row) => sum + row.warnings.length, 0),
    }];
  })
);

const payload = {
  policy: {
    publicUx: "simple-first-progressive-details",
    logos: "individual-assets-only",
    identity: "confirm-before-final-publication",
    publicationReadiness: "content-ready-with-logo-fallback-allowed",
    maxVisibleTags: 2,
  },
  summary: {
    partners: rows.length,
    categories: categories.size,
    publicationConfirmed: publicationConfirmed.length,
    contentReady: contentReady.length,
    needsContent: needsContent.length,
    identityReview: identityReview.length,
    assetPermissionReview: assetPermissionReview.length,
    withDetails: rows.filter((row) => row.hasDetails).length,
    withLogo: rows.filter((row) => row.hasLogo).length,
    assetReady: rows.filter((row) => row.assetReady).length,
    averageCompletenessScore: rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.completenessScore, 0) / rows.length)
      : 100,
    trackedMissingLogos: rows.filter((row) => !row.hasLogo && row.hasLogoBacklog).length,
    editorialWarnings: editorialWarnings.length,
  },
  structuralErrors,
  verification: {
    identityReview,
    assetPermissionReview,
  },
  readiness: {
    contentReady,
    needsContent,
  },
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
