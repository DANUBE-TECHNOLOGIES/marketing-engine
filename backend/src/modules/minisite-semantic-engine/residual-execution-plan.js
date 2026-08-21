"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function coverageMap(agency = {}) {
  return new Map((agency.coverage || []).map((row) => [String(row.intentKey), row]));
}

function coverageSatisfiedElsewhere(coverage, pageSlug) {
  if (!coverage || !["strong", "covered"].includes(String(coverage.status))) return false;
  return Boolean(coverage.bestPageSlug && String(coverage.bestPageSlug) !== String(pageSlug));
}

function managedRouteAlternative(coverage, pageSlug) {
  if (!coverage) return null;
  return (coverage.candidatePages || []).find((candidate) => (
    candidate?.managedRoute === true
    && String(candidate.slug) !== String(pageSlug)
    && Number(candidate.score || 0) > 0
    && Number(candidate.localityScore || 0) >= 30
  )) || null;
}

function residualMetadata(pagePlan = {}, agency = {}) {
  const requested = Boolean(
    pagePlan.metadata?.rewriteTitle
    || pagePlan.metadata?.rewriteH1
    || pagePlan.metadata?.rewriteMetaDescription
  );
  if (!requested) return { eligible: false, reason: "metadata-preserved-by-consolidated-plan" };

  const coverage = coverageMap(agency).get(String(pagePlan.primaryIntent || ""));
  if (coverageSatisfiedElsewhere(coverage, pagePlan.pageSlug)) {
    return {
      eligible: false,
      reason: "primary-intent-covered-elsewhere",
      coveredByPageSlug: coverage.bestPageSlug,
      coverageStatus: coverage.status,
    };
  }

  return {
    eligible: true,
    reason: "primary-intent-residual-deficit",
    proposed: pagePlan.metadata,
  };
}

function residualSection(section = {}, pagePlan = {}, agency = {}) {
  const coverage = coverageMap(agency).get(String(section.intentKey || ""));

  if (coverageSatisfiedElsewhere(coverage, pagePlan.pageSlug)) {
    return {
      ...section,
      eligible: false,
      suppressionReason: "intent-covered-elsewhere",
      coveredByPageSlug: coverage.bestPageSlug,
      coverageStatus: coverage.status,
    };
  }

  const managedAlternative = managedRouteAlternative(coverage, pagePlan.pageSlug);
  if (managedAlternative) {
    return {
      ...section,
      eligible: false,
      suppressionReason: "managed-route-preferred",
      coveredByPageSlug: managedAlternative.slug,
      coverageStatus: coverage?.status || null,
    };
  }

  if (String(pagePlan.pageSlug) === "home") {
    return {
      ...section,
      eligible: false,
      suppressionReason: "home-secondary-fill-prohibited",
      coverageStatus: coverage?.status || null,
    };
  }

  return {
    ...section,
    eligible: true,
    suppressionReason: null,
    coverageStatus: coverage?.status || null,
  };
}

function residualPagePlan(pagePlan = {}, agency = {}) {
  const metadata = residualMetadata(pagePlan, agency);
  const sectionDecisions = (pagePlan.secondaryIntentSections || []).map((section) => residualSection(section, pagePlan, agency));
  const eligibleSections = sectionDecisions.filter((section) => section.eligible === true);
  const suppressedSections = sectionDecisions.filter((section) => section.eligible !== true);
  const executable = metadata.eligible === true || eligibleSections.length > 0;

  const result = {
    siteSlug: agency.site?.slug || null,
    agencyId: agency.site?.agencyId || null,
    city: agency.site?.city || null,
    pageSlug: pagePlan.pageSlug,
    pageId: pagePlan.pageId || null,
    sourcePagePlanFingerprint: pagePlan.pagePlanFingerprint || null,
    primaryIntent: pagePlan.primaryIntent || null,
    executable,
    metadata,
    eligibleSections,
    suppressedSections,
    safeguards: {
      architectureCoverageChecked: true,
      homeSecondaryFillProhibited: true,
      managedRoutesPreferred: true,
      preserveManualBodyCopy: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      writeRequiresSealedIntent: true,
    },
  };

  return { ...result, residualPageFingerprint: fingerprint(result) };
}

function buildResidualExecutionPlan(networkPlan = {}, consolidatedPlan = {}) {
  if (consolidatedPlan.version !== "mse-25.40" || consolidatedPlan.operation !== "consolidated-semantic-execution-preview") {
    const error = new Error("Plan consolidé MSE-25.40 invalide.");
    error.code = "MSE_25_40_RESIDUAL_CONSOLIDATED_INVALID";
    throw error;
  }
  if (consolidatedPlan.sourcePlanFingerprint !== networkPlan.planFingerprint) {
    const error = new Error("Le plan consolidé ne correspond plus au preview réseau scellé.");
    error.code = "MSE_25_40_RESIDUAL_SOURCE_MISMATCH";
    throw error;
  }

  const agencies = new Map((networkPlan.agencies || []).map((agency) => [String(agency.site?.slug || ""), agency]));
  const sites = (consolidatedPlan.sites || []).map((site) => {
    const agency = agencies.get(String(site.siteSlug || ""));
    if (!agency) {
      const error = new Error(`Agence ${site.siteSlug} absente du preview réseau.`);
      error.code = "MSE_25_40_RESIDUAL_AGENCY_MISSING";
      throw error;
    }
    const pages = (site.pages || []).map((page) => residualPagePlan(page, agency));
    return {
      siteSlug: site.siteSlug,
      agencyId: site.agencyId,
      city: site.city,
      pages,
      executablePages: pages.filter((page) => page.executable),
    };
  });

  const allPages = sites.flatMap((site) => site.pages);
  const executablePages = allPages.filter((page) => page.executable);
  const result = {
    version: "mse-25.40",
    operation: "residual-semantic-execution-plan",
    sourcePlanFingerprint: networkPlan.planFingerprint || null,
    consolidatedExecutionFingerprint: consolidatedPlan.executionFingerprint || null,
    readOnly: true,
    writes: false,
    destructive: false,
    executable: executablePages.length > 0,
    policy: {
      evaluateWholePublicArchitectureFirst: true,
      noHomeScoreFilling: true,
      managedRoutesPreferred: true,
      preferExistingPages: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
    sites,
    summary: {
      evaluatedPageCount: allPages.length,
      executablePageCount: executablePages.length,
      suppressedPageCount: allPages.length - executablePages.length,
      eligibleMetadataPageCount: executablePages.filter((page) => page.metadata.eligible === true).length,
      eligibleSectionCount: executablePages.reduce((sum, page) => sum + page.eligibleSections.length, 0),
      suppressedSectionCount: allPages.reduce((sum, page) => sum + page.suppressedSections.length, 0),
      homeSecondarySectionWriteCount: executablePages
        .filter((page) => page.pageSlug === "home")
        .reduce((sum, page) => sum + page.eligibleSections.length, 0),
      automaticWriteCount: 0,
    },
  };

  return { ...result, residualExecutionFingerprint: fingerprint(result) };
}

module.exports = {
  buildResidualExecutionPlan,
  coverageMap,
  coverageSatisfiedElsewhere,
  fingerprint,
  managedRouteAlternative,
  residualMetadata,
  residualPagePlan,
  residualSection,
};
