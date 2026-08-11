"use strict";

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function action(priority, code, title, detail, source, target = null) {
  return { priority, code, title, detail, source, target };
}

function actionsFromRankings(check) {
  const opportunities = Array.isArray(check?.opportunities) ? check.opportunities : [];
  return opportunities.map((item) =>
    action(
      item.priority === "high" ? "high" : "medium",
      `RANKING_${String(item.type || "OPPORTUNITY").toUpperCase()}`,
      item.targetPage
        ? `Renforcer ${item.targetPage.title}`
        : `Travailler la requête « ${item.keyword} »`,
      item.action,
      "LOCAL_RANKINGS",
      item.targetPage
        ? { type: "page", slug: item.targetPage.slug, pageId: item.targetPage.pageId }
        : { type: "keyword", keyword: item.keyword, city: item.city }
    )
  );
}

function actionsFromCitations(check) {
  const inconsistencies = Array.isArray(check?.inconsistencies) ? check.inconsistencies : [];
  return inconsistencies.map((item) =>
    action(
      "high",
      "CITATION_INCONSISTENCY",
      `Corriger ${item.directory}`,
      `Mettre en cohérence : ${item.fields.join(", ")}.`,
      "LOCAL_CITATIONS",
      { type: "directory", listingId: item.listingId, directory: item.directory }
    )
  );
}

function actionsFromTrust(check) {
  if (!check || check.passed) return [];
  return [
    action(
      check.reviewCount === 0 || check.latestAgeDays > check.freshnessTargetDays ? "high" : "medium",
      "LOCAL_TRUST_GAP",
      "Renforcer la preuve de confiance locale",
      check.recommendation || "Améliorer la collecte et la gestion des avis clients réels.",
      "LOCAL_TRUST"
    ),
  ];
}

function actionsFromLocalSeo(check) {
  if (!check || check.passed) return [];
  return [
    action(
      "high",
      "LOCAL_SEO_INCOMPLETE",
      "Compléter les signaux Google locaux",
      check.recommendation,
      "LOCAL_SEO"
    ),
  ];
}

function actionsFromLocalContent(check) {
  if (!check || check.passed) return [];
  return [
    action(
      "medium",
      "LOCAL_CONTENT_THIN",
      "Enrichir le contenu propre à l’agence",
      check.recommendation,
      "LOCAL_CONTENT"
    ),
  ];
}

function actionsFromSimilarity(check) {
  if (!check || check.passed) return [];
  const match = Array.isArray(check.matches) ? check.matches[0] : null;
  return [
    action(
      "high",
      "CONTENT_SIMILARITY",
      "Différencier le contenu de l’agence",
      check.recommendation,
      "CONTENT_SIMILARITY",
      match ? { type: "page", slug: match.slug, peerAgencyName: match.peerAgencyName } : null
    ),
  ];
}

function buildSeoActionQueue(report) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const byCode = new Map(checks.map((check) => [check?.code, check]));

  const actions = [
    ...actionsFromRankings(byCode.get("LOCAL_RANKINGS")),
    ...actionsFromCitations(byCode.get("LOCAL_CITATIONS")),
    ...actionsFromTrust(byCode.get("LOCAL_TRUST")),
    ...actionsFromLocalSeo(byCode.get("LOCAL_SEO")),
    ...actionsFromSimilarity(byCode.get("CONTENT_SIMILARITY")),
    ...actionsFromLocalContent(byCode.get("LOCAL_CONTENT")),
  ].filter((item) => item?.detail);

  actions.sort((left, right) => {
    const priorityDelta = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return left.title.localeCompare(right.title, "fr");
  });

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    total: actions.length,
    highPriority: actions.filter((item) => item.priority === "high" || item.priority === "critical").length,
    actions: actions.slice(0, 30),
  };
}

function applySeoActionQueue(report) {
  return {
    ...report,
    version: "2.5",
    seoActions: buildSeoActionQueue(report),
  };
}

module.exports = {
  PRIORITY_RANK,
  actionsFromRankings,
  actionsFromCitations,
  actionsFromTrust,
  actionsFromLocalSeo,
  actionsFromLocalContent,
  actionsFromSimilarity,
  buildSeoActionQueue,
  applySeoActionQueue,
};
