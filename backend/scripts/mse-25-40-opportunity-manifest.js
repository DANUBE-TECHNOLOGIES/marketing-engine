"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function manifestFromPreflight(report = {}) {
  if (report.version !== "mse-25.40" || report.operation !== "semantic-preflight") {
    const error = new Error("Rapport preflight MSE-25.40 invalide.");
    error.code = "MSE_25_40_INVALID_PREFLIGHT_REPORT";
    throw error;
  }
  if (report.readOnly !== true || report.writes !== false || report.safety?.verified !== true) {
    const error = new Error("Le preflight MSE-25.40 n'est pas certifié read-only/safe.");
    error.code = "MSE_25_40_UNSAFE_PREFLIGHT_REPORT";
    throw error;
  }

  const preview = report.preview || {};
  const opportunities = [];
  const managedRouteReviews = [];
  const evidenceGates = [];
  const cannibalization = [];

  for (const agency of preview.agencies || []) {
    for (const proposal of agency.semanticProposals?.proposals || []) {
      const base = {
        siteSlug: agency.site?.slug || null,
        agencyId: agency.site?.agencyId || null,
        city: agency.site?.city || null,
        intentKey: proposal.intentKey,
        pageSlug: proposal.pageSlug,
        type: proposal.type,
        readOnly: true,
        writes: false,
      };
      if (proposal.type === "existing-page-semantic-uplift") {
        opportunities.push({ ...base, valueScore: proposal.valueScore || 0, reason: proposal.reason || null, proposed: proposal.proposed, safeguards: proposal.safeguards });
      } else if (proposal.type === "managed-route-semantic-review") {
        managedRouteReviews.push({
          ...base,
          valueScore: proposal.valueScore || 0,
          reason: proposal.reason || null,
          writeEligible: false,
          requiresHumanReview: true,
          proposed: proposal.proposed,
          safeguards: proposal.safeguards,
        });
      } else {
        evidenceGates.push({ ...base, requiresSearchDemandEvidence: true, requiresHumanReview: true, suggestedTitle: proposal.suggestedTitle, suggestedH1: proposal.suggestedH1, editorialBrief: proposal.editorialBrief });
      }
    }
    for (const conflict of agency.cannibalization || []) {
      cannibalization.push({ siteSlug: agency.site?.slug || null, agencyId: agency.site?.agencyId || null, ...conflict });
    }
  }

  opportunities.sort((a, b) => b.valueScore - a.valueScore || String(a.siteSlug).localeCompare(String(b.siteSlug), "fr") || String(a.intentKey).localeCompare(String(b.intentKey), "fr"));
  managedRouteReviews.sort((a, b) => b.valueScore - a.valueScore || String(a.siteSlug).localeCompare(String(b.siteSlug), "fr") || String(a.intentKey).localeCompare(String(b.intentKey), "fr"));
  evidenceGates.sort((a, b) => String(a.siteSlug).localeCompare(String(b.siteSlug), "fr") || String(a.intentKey).localeCompare(String(b.intentKey), "fr"));

  const base = {
    version: "mse-25.40",
    operation: "semantic-opportunity-manifest",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    source: {
      repository: report.repository,
      planFingerprint: preview.planFingerprint,
      preflightGeneratedAt: report.generatedAt,
    },
    policy: {
      preferExistingPages: true,
      newPageEvidenceGate: true,
      managedRoutesAware: true,
      doorwayGuard: true,
      automaticWrites: false,
    },
    summary: {
      existingPageOpportunityCount: opportunities.length,
      highValueOpportunityCount: opportunities.filter((row) => row.valueScore >= 70).length,
      managedRouteReviewCount: managedRouteReviews.length,
      newPageEvidenceGateCount: evidenceGates.length,
      cannibalizationAdvisoryCount: cannibalization.length,
      automaticWriteCount: 0,
    },
    opportunities,
    managedRouteReviews,
    evidenceGates,
    cannibalization,
  };
  return { ...base, manifestFingerprint: fingerprint(base) };
}

function run({ input, output } = {}) {
  const source = path.resolve(input || process.env.MSE_25_40_PREFLIGHT_REPORT || "");
  if (!source || !fs.existsSync(source)) {
    const error = new Error("MSE_25_40_PREFLIGHT_REPORT est obligatoire et doit exister.");
    error.code = "MSE_25_40_PREFLIGHT_REPORT_NOT_FOUND";
    throw error;
  }
  const report = JSON.parse(fs.readFileSync(source, "utf8"));
  const manifest = manifestFromPreflight(report);
  const directory = path.resolve(process.env.MSE_25_40_REPORT_DIR || path.join(os.homedir(), "mse-25-40-reports"));
  fs.mkdirSync(directory, { recursive: true });
  const target = path.resolve(output || process.env.MSE_25_40_OPPORTUNITY_MANIFEST_OUTPUT || path.join(directory, `mse-25-40-opportunities-${manifest.manifestFingerprint.slice(0, 12)}.json`));
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const result = { ok: true, readOnly: true, writes: false, reportPath: target, manifestFingerprint: manifest.manifestFingerprint, summary: manifest.summary };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_OPPORTUNITY_MANIFEST_FAILED", message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { fingerprint, manifestFromPreflight, run };
