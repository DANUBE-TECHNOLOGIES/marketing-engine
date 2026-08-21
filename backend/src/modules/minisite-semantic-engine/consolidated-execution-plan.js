"use strict";

const crypto = require("node:crypto");
const { INTENT_BY_KEY } = require("./catalog");
const { h1For, metaFor, titleFor } = require("./semantic-proposals");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function groupByPage(proposals = []) {
  const groups = new Map();
  for (const proposal of proposals) {
    if (proposal?.type !== "existing-page-semantic-uplift" || !proposal.pageSlug) continue;
    const key = proposal.pageSlug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(proposal);
  }
  return groups;
}

function pageBySlug(plan = {}, slug) {
  return (plan.pages || []).find((page) => String(page.slug) === String(slug)) || null;
}

function primaryCoverage(plan = {}, page = {}) {
  if (!page?.primaryIntent) return null;
  const coverage = (plan.coverage || []).find((row) => row.intentKey === page.primaryIntent);
  if (!coverage || coverage.bestPageSlug !== page.slug) return null;
  return coverage;
}

function sectionForProposal(proposal = {}) {
  const brief = proposal.proposed?.editorialBrief || {};
  return {
    intentKey: proposal.intentKey,
    label: INTENT_BY_KEY.get(proposal.intentKey)?.label || proposal.intentKey,
    valueScore: Number(proposal.valueScore || 0),
    reason: proposal.reason || null,
    headingLevel: "h2",
    heading: brief.heading || null,
    targetWords: Number(brief.targetWords || 180),
    requiredThemes: [...(brief.requiredThemes || [])],
    forbiddenPatterns: [...(brief.forbiddenPatterns || [])],
    internalLinks: [...(proposal.proposed?.internalLinks || [])],
  };
}

function dedupeLinks(sections = [], pageSlug) {
  const seen = new Set();
  const links = [];
  for (const section of sections) {
    for (const link of section.internalLinks || []) {
      if (!link?.toPageSlug || link.toPageSlug === pageSlug) continue;
      const key = `${link.toPageSlug}:${link.toIntent || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push(link);
    }
  }
  return links.slice(0, 6);
}

function consolidatedPagePlan(plan = {}, pageSlug, proposals = []) {
  const page = pageBySlug(plan, pageSlug);
  if (!page) {
    const error = new Error(`Page ${pageSlug} introuvable dans le plan sémantique.`);
    error.code = "MSE_25_40_CONSOLIDATION_PAGE_NOT_FOUND";
    throw error;
  }

  const primary = primaryCoverage(plan, page);
  const primaryStrong = primary?.status === "strong";
  const sections = proposals
    .slice()
    .sort((a, b) => Number(b.valueScore || 0) - Number(a.valueScore || 0) || String(a.intentKey).localeCompare(String(b.intentKey), "fr"))
    .map(sectionForProposal);

  const result = {
    pageSlug,
    pageId: page.pageId || null,
    primaryIntent: page.primaryIntent || null,
    primaryIntentScore: Number(page.primaryIntentScore || 0),
    localityScore: Number(page.localityScore || 0),
    primaryCoverageStatus: primary?.status || null,
    readOnly: true,
    writes: false,
    metadata: primaryStrong
      ? {
          strategy: "preserve-existing-primary-identity",
          rewriteTitle: false,
          rewriteH1: false,
          rewriteMetaDescription: false,
          reason: "primary-intent-already-strong",
        }
      : {
          strategy: "strengthen-primary-identity-only",
          rewriteTitle: true,
          rewriteH1: true,
          rewriteMetaDescription: true,
          proposedTitle: titleFor(page.primaryIntent, plan.site?.city || ""),
          proposedH1: h1For(page.primaryIntent, plan.site?.city || ""),
          proposedMetaDescription: metaFor(page.primaryIntent, plan.site?.city || ""),
          reason: "primary-intent-not-strong",
        },
    secondaryIntentSections: sections,
    consolidatedInternalLinks: dedupeLinks(sections, pageSlug),
    safeguards: {
      oneTitlePerPage: true,
      oneH1PerPage: true,
      preservePrimaryIntent: true,
      preserveManualBodyCopy: true,
      appendOrEnrichSections: true,
      noKeywordStuffing: true,
      noDoorwayExpansion: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      noAutomaticWrite: true,
    },
  };

  return { ...result, pagePlanFingerprint: fingerprint(result) };
}

function buildConsolidatedExecutionPlan(networkPlan = {}) {
  const sitePlans = [];
  for (const agency of networkPlan.agencies || []) {
    const proposals = agency.semanticProposals?.proposals || [];
    const groups = groupByPage(proposals);
    const pages = [...groups.entries()]
      .map(([pageSlug, rows]) => consolidatedPagePlan(agency, pageSlug, rows))
      .sort((a, b) => a.pageSlug.localeCompare(b.pageSlug, "fr"));

    sitePlans.push({
      siteSlug: agency.site?.slug || null,
      agencyId: agency.site?.agencyId || null,
      city: agency.site?.city || null,
      pages,
      pageActionCount: pages.length,
      secondaryIntentCount: pages.reduce((sum, row) => sum + row.secondaryIntentSections.length, 0),
    });
  }

  const pagePlans = sitePlans.flatMap((site) => site.pages.map((page) => ({ siteSlug: site.siteSlug, city: site.city, ...page })));
  const metadataRewritePageCount = pagePlans.filter((page) => page.metadata?.rewriteTitle || page.metadata?.rewriteH1 || page.metadata?.rewriteMetaDescription).length;
  const result = {
    version: "mse-25.40",
    operation: "consolidated-semantic-execution-preview",
    sourcePlanFingerprint: networkPlan.planFingerprint || null,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      oneTitlePerPage: true,
      oneH1PerPage: true,
      preserveStrongPrimaryIntent: true,
      secondaryIntentsUseSections: true,
      preferExistingPages: true,
      doorwayGuard: true,
      automaticWrites: false,
    },
    sites: sitePlans,
    summary: {
      siteCount: sitePlans.length,
      pageActionCount: pagePlans.length,
      secondaryIntentCount: pagePlans.reduce((sum, row) => sum + row.secondaryIntentSections.length, 0),
      metadataRewritePageCount,
      metadataPreservePageCount: pagePlans.length - metadataRewritePageCount,
      titleCollisionCount: 0,
      h1CollisionCount: 0,
      automaticWriteCount: 0,
    },
  };
  return { ...result, executionFingerprint: fingerprint(result) };
}

module.exports = {
  buildConsolidatedExecutionPlan,
  consolidatedPagePlan,
  dedupeLinks,
  fingerprint,
  groupByPage,
  primaryCoverage,
  sectionForProposal,
};
