"use strict";

const crypto = require("node:crypto");
const {
  CANNIBALIZATION_THRESHOLD,
  DEFAULT_COVERAGE_THRESHOLD,
  INTENT_CATALOG,
  STRONG_COVERAGE_THRESHOLD,
} = require("./catalog");
const { buildTopicGraph } = require("./topic-graph");
const { planSemanticOpportunities } = require("./opportunity-planner");

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function blockText(block = {}) {
  const content = block?.content;
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => blockText({ content: item })).join(" ");
  if (typeof content === "object") return Object.values(content).map((item) => blockText({ content: item })).join(" ");
  return String(content);
}

function pageSignals(page = {}) {
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const hero = blocks.find((block) => normalize(block.blockType || block.type).includes("hero"));
  const h1 = String(hero?.content?.title || "");
  const title = String(page.seoTitle || page.title || "");
  const meta = String(page.metaDescription || page.seoDescription || "");
  const body = blocks.map(blockText).join(" ");
  return {
    slug: normalize(page.slug || "home"),
    title: normalize(title),
    h1: normalize(h1),
    meta: normalize(meta),
    body: normalize(body),
  };
}

function includesPhrase(haystack, needle) {
  const phrase = normalize(needle);
  return Boolean(phrase && (` ${haystack} `).includes(` ${phrase} `));
}

function localityScore(page = {}, city = "") {
  const place = normalize(city);
  if (!place) return { score: 0, matches: [] };
  const signals = pageSignals(page);
  let score = 0;
  const matches = [];
  if (includesPhrase(signals.title, place)) { score += 35; matches.push("title"); }
  if (includesPhrase(signals.h1, place)) { score += 30; matches.push("h1"); }
  if (includesPhrase(signals.meta, place)) { score += 20; matches.push("meta"); }
  if (includesPhrase(signals.body, place)) { score += 15; matches.push("body"); }
  return { score: Math.min(100, score), matches };
}

function intentScore(page = {}, intent = {}) {
  const signals = pageSignals(page);
  let score = 0;
  const matches = [];
  for (const hint of intent.pageHints || []) {
    if (includesPhrase(signals.slug, hint)) { score += 55; matches.push(`slug:${hint}`); }
  }
  for (const term of intent.terms || []) {
    if (includesPhrase(signals.title, term)) { score += 30; matches.push(`title:${term}`); }
    if (includesPhrase(signals.h1, term)) { score += 28; matches.push(`h1:${term}`); }
    if (includesPhrase(signals.meta, term)) { score += 16; matches.push(`meta:${term}`); }
    if (includesPhrase(signals.body, term)) { score += 8; matches.push(`body:${term}`); }
  }
  return { score: Math.min(100, score), matches: [...new Set(matches)] };
}

function analyzePage(page = {}, { city = "" } = {}) {
  const locality = localityScore(page, city);
  const intents = INTENT_CATALOG
    .map((intent) => ({ ...intent, ...intentScore(page, intent) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.priority - a.priority || a.key.localeCompare(b.key));
  return {
    pageId: page.id || null,
    slug: String(page.slug || "home"),
    title: page.title || null,
    seoTitle: page.seoTitle || null,
    published: page.published === true || String(page.status || "").toLowerCase() === "published",
    managedRoute: page.managedRoute === true,
    writeEligible: page.writeEligible !== false,
    semanticSource: page.semanticSource || "website-designer",
    localityScore: locality.score,
    localityMatches: locality.matches,
    primaryIntent: intents[0]?.key || null,
    primaryIntentScore: intents[0]?.score || 0,
    intents: intents.map(({ key, label, commercial, priority, score, matches }) => ({ key, label, commercial, priority, score, matches })),
  };
}

function coverageForIntent(intent, pages) {
  const candidates = pages
    .map((page) => ({ page, row: page.intents.find((item) => item.key === intent.key) }))
    .filter((item) => item.row)
    .sort((a, b) => b.row.score - a.row.score || b.page.localityScore - a.page.localityScore || String(a.page.slug).localeCompare(String(b.page.slug), "fr"));
  const best = candidates[0] || null;
  const score = best?.row?.score || 0;
  const localScore = best?.page?.localityScore || 0;
  const strong = score >= STRONG_COVERAGE_THRESHOLD && (!intent.commercial || localScore >= 50);
  const covered = score >= DEFAULT_COVERAGE_THRESHOLD && (!intent.commercial || localScore >= 30);
  let gapReason = null;
  if (!strong && intent.commercial && score >= DEFAULT_COVERAGE_THRESHOLD && localScore < 30) gapReason = "locality-weak";
  else if (!strong && score < DEFAULT_COVERAGE_THRESHOLD) gapReason = "intent-weak";
  else if (!strong && intent.commercial && localScore < 50) gapReason = "locality-partial";
  return {
    intentKey: intent.key,
    label: intent.label,
    commercial: intent.commercial,
    priority: intent.priority,
    status: strong ? "strong" : covered ? "covered" : "gap",
    gapReason,
    bestPageSlug: best?.page?.slug || null,
    bestScore: score,
    bestLocalityScore: localScore,
    bestPageManagedRoute: best?.page?.managedRoute === true,
    bestPageWriteEligible: best?.page?.writeEligible !== false,
    candidatePages: candidates.map((item) => ({
      slug: item.page.slug,
      score: item.row.score,
      localityScore: item.page.localityScore,
      managedRoute: item.page.managedRoute === true,
      writeEligible: item.page.writeEligible !== false,
    })),
  };
}

function buildCannibalization(pages) {
  const conflicts = [];
  for (const intent of INTENT_CATALOG) {
    const candidates = pages
      .map((page) => ({
        slug: page.slug,
        score: page.intents.find((item) => item.key === intent.key)?.score || 0,
        localityScore: page.localityScore || 0,
        managedRoute: page.managedRoute === true,
      }))
      .filter((row) => row.score >= CANNIBALIZATION_THRESHOLD)
      .sort((a, b) => b.score - a.score || b.localityScore - a.localityScore || a.slug.localeCompare(b.slug, "fr"));
    if (candidates.length < 2) continue;
    const delta = Math.abs(candidates[0].score - candidates[1].score);
    conflicts.push({
      intentKey: intent.key,
      label: intent.label,
      severity: delta <= 12 ? "medium" : "low",
      blocking: false,
      pages: candidates,
      recommendation: "clarify-primary-target",
    });
  }
  return conflicts;
}

function opportunityForCoverage(row, { city }) {
  if (row.status === "strong") return null;
  if (row.bestPageSlug && row.bestPageManagedRoute) {
    return {
      type: "managed-route-semantic-review",
      intentKey: row.intentKey,
      label: row.label,
      pageSlug: row.bestPageSlug,
      priority: row.commercial ? "high" : "medium",
      currentScore: row.bestScore,
      currentLocalityScore: row.bestLocalityScore,
      targetScore: STRONG_COVERAGE_THRESHOLD,
      targetLocalityScore: row.commercial ? 50 : null,
      reason: row.gapReason,
      locationScope: city || null,
      autoCreate: false,
      writeEligible: false,
      requiresHumanReview: true,
    };
  }
  if (row.bestPageSlug) {
    return {
      type: "strengthen-existing-page",
      intentKey: row.intentKey,
      label: row.label,
      pageSlug: row.bestPageSlug,
      priority: row.commercial ? "high" : "medium",
      currentScore: row.bestScore,
      currentLocalityScore: row.bestLocalityScore,
      targetScore: STRONG_COVERAGE_THRESHOLD,
      targetLocalityScore: row.commercial ? 50 : null,
      reason: row.gapReason,
      locationScope: city || null,
      autoCreate: false,
      writeEligible: true,
    };
  }
  return {
    type: "page-candidate-review",
    intentKey: row.intentKey,
    label: row.label,
    pageSlug: null,
    priority: row.commercial ? "medium" : "low",
    currentScore: 0,
    currentLocalityScore: 0,
    targetScore: STRONG_COVERAGE_THRESHOLD,
    targetLocalityScore: row.commercial ? 50 : null,
    reason: "intent-absent",
    locationScope: city || null,
    autoCreate: false,
    requiresHumanReview: true,
  };
}

function semanticPlan(site = {}) {
  const city = String(site.agency?.city || site.city || "").trim();
  const publishedPages = (site.pages || []).filter((page) => page.published === true || String(page.status || "").toLowerCase() === "published");
  const pages = publishedPages.map((page) => analyzePage(page, { city }));
  const coverage = INTENT_CATALOG.map((intent) => coverageForIntent(intent, pages));
  const cannibalization = buildCannibalization(pages);
  const rawOpportunities = coverage.map((row) => opportunityForCoverage(row, { city })).filter(Boolean);
  const graph = buildTopicGraph({ coverage, pages });
  const opportunityPlan = planSemanticOpportunities({ opportunities: rawOpportunities }, graph);
  const result = {
    version: "mse-25.40",
    operation: "local-semantic-preview",
    readOnly: true,
    writes: false,
    destructive: false,
    site: { id: site.id || null, slug: site.slug || null, agencyId: site.agencyId || site.agency?.id || null, city: city || null },
    policy: {
      doorwayGuard: true,
      locationExpansion: false,
      allowedLocationScope: city ? [city] : [],
      preferExistingPages: true,
      newPageEvidenceGate: true,
      managedRoutesAware: true,
      autoCreatePages: false,
      autoPublishPages: false,
      automaticWrites: false,
    },
    summary: {
      publishedPageCount: pages.length,
      managedRoutePageCount: pages.filter((page) => page.managedRoute).length,
      writablePageCount: pages.filter((page) => page.writeEligible).length,
      strongIntentCount: coverage.filter((row) => row.status === "strong").length,
      coveredIntentCount: coverage.filter((row) => row.status === "covered").length,
      semanticGapCount: coverage.filter((row) => row.status === "gap").length,
      commercialGapCount: coverage.filter((row) => row.status === "gap" && row.commercial).length,
      localQualificationGapCount: coverage.filter((row) => row.commercial && ["locality-weak", "locality-partial"].includes(row.gapReason)).length,
      opportunityCount: opportunityPlan.summary.opportunityCount,
      highValueExistingPageCount: opportunityPlan.summary.highValueExistingPageCount,
      newPageEvidenceGateCount: opportunityPlan.summary.newPageEvidenceGateCount,
      topicGraphNodeCount: graph.summary.nodeCount,
      topicGraphEdgeCount: graph.summary.edgeCount,
      semanticOrphanPageCount: graph.summary.orphanPageCount,
      cannibalizationConflictCount: cannibalization.length,
      blockingConflictCount: 0,
    },
    coverage,
    pages,
    opportunities: opportunityPlan.items,
    opportunitySummary: opportunityPlan.summary,
    topicGraph: graph,
    cannibalization,
  };
  return { ...result, planFingerprint: fingerprint(result) };
}

function networkSemanticPlan(sites = []) {
  const published = (sites || []).filter((site) => String(site.status || "").toLowerCase() === "published" || Boolean(site.publishedAt));
  const excludedSites = (sites || []).filter((site) => !published.includes(site)).map((site) => ({ siteSlug: site.slug || null, agencyId: site.agencyId || site.agency?.id || null, status: site.status || null, reason: "site-not-published" }));
  const agencies = published.map(semanticPlan);
  const result = {
    version: "mse-25.40",
    operation: "network-local-semantic-preview",
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      doorwayGuard: true,
      locationExpansion: false,
      preferExistingPages: true,
      newPageEvidenceGate: true,
      managedRoutesAware: true,
      autoCreatePages: false,
      autoPublishPages: false,
      automaticWrites: false,
    },
    agencies,
    excludedSites,
    summary: {
      agenciesProcessed: agencies.length,
      agenciesExcluded: excludedSites.length,
      publishedPageCount: agencies.reduce((sum, row) => sum + row.summary.publishedPageCount, 0),
      managedRoutePageCount: agencies.reduce((sum, row) => sum + row.summary.managedRoutePageCount, 0),
      writablePageCount: agencies.reduce((sum, row) => sum + row.summary.writablePageCount, 0),
      strongIntentCount: agencies.reduce((sum, row) => sum + row.summary.strongIntentCount, 0),
      coveredIntentCount: agencies.reduce((sum, row) => sum + row.summary.coveredIntentCount, 0),
      semanticGapCount: agencies.reduce((sum, row) => sum + row.summary.semanticGapCount, 0),
      commercialGapCount: agencies.reduce((sum, row) => sum + row.summary.commercialGapCount, 0),
      localQualificationGapCount: agencies.reduce((sum, row) => sum + row.summary.localQualificationGapCount, 0),
      opportunityCount: agencies.reduce((sum, row) => sum + row.summary.opportunityCount, 0),
      highValueExistingPageCount: agencies.reduce((sum, row) => sum + row.summary.highValueExistingPageCount, 0),
      newPageEvidenceGateCount: agencies.reduce((sum, row) => sum + row.summary.newPageEvidenceGateCount, 0),
      topicGraphEdgeCount: agencies.reduce((sum, row) => sum + row.summary.topicGraphEdgeCount, 0),
      semanticOrphanPageCount: agencies.reduce((sum, row) => sum + row.summary.semanticOrphanPageCount, 0),
      cannibalizationConflictCount: agencies.reduce((sum, row) => sum + row.summary.cannibalizationConflictCount, 0),
      blockingConflictCount: 0,
    },
  };
  return { ...result, planFingerprint: fingerprint(result) };
}

module.exports = {
  analyzePage,
  blockText,
  buildCannibalization,
  coverageForIntent,
  fingerprint,
  intentScore,
  localityScore,
  networkSemanticPlan,
  normalize,
  opportunityForCoverage,
  pageSignals,
  semanticPlan,
};
