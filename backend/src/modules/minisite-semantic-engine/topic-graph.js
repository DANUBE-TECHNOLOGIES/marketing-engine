"use strict";

const { INTENT_BY_KEY } = require("./catalog");

const TOPIC_RELATIONS = Object.freeze({
  agency: ["services", "reviews", "team", "contact", "destinations"],
  services: ["ticketing", "cruise", "circuit", "tailor-made", "stay", "contact"],
  ticketing: ["services", "contact", "destinations"],
  cruise: ["services", "destinations", "partners", "contact"],
  circuit: ["services", "destinations", "partners", "contact"],
  "tailor-made": ["services", "destinations", "team", "contact"],
  stay: ["services", "destinations", "partners", "contact"],
  destinations: ["services", "cruise", "circuit", "tailor-made", "stay"],
  reviews: ["agency", "team", "contact"],
  team: ["agency", "tailor-made", "contact"],
  partners: ["cruise", "circuit", "stay", "services"],
  commitments: ["agency", "services", "contact"],
  contact: ["agency", "services"],
});

function canonicalOwner(coverage = [], intentKey) {
  const row = coverage.find((item) => item.intentKey === intentKey);
  if (!row?.bestPageSlug) return null;
  return {
    intentKey,
    slug: row.bestPageSlug,
    score: row.bestScore || 0,
    localityScore: row.bestLocalityScore || 0,
    status: row.status,
  };
}

function buildTopicGraph(plan = {}) {
  const nodes = [];
  const ownerByIntent = new Map();

  for (const row of plan.coverage || []) {
    const owner = canonicalOwner(plan.coverage || [], row.intentKey);
    if (!owner) continue;
    ownerByIntent.set(row.intentKey, owner);
    nodes.push({
      intentKey: row.intentKey,
      label: row.label,
      commercial: row.commercial,
      priority: row.priority,
      pageSlug: owner.slug,
      status: row.status,
      intentScore: owner.score,
      localityScore: owner.localityScore,
    });
  }

  const edges = [];
  const seen = new Set();
  for (const [sourceIntent, targets] of Object.entries(TOPIC_RELATIONS)) {
    const source = ownerByIntent.get(sourceIntent);
    if (!source) continue;
    for (const targetIntent of targets) {
      const target = ownerByIntent.get(targetIntent);
      if (!target || target.slug === source.slug) continue;
      const key = `${source.slug}->${target.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const targetDefinition = INTENT_BY_KEY.get(targetIntent);
      edges.push({
        fromIntent: sourceIntent,
        toIntent: targetIntent,
        fromPageSlug: source.slug,
        toPageSlug: target.slug,
        targetCommercial: Boolean(targetDefinition?.commercial),
        targetPriority: targetDefinition?.priority || 0,
      });
    }
  }

  const inbound = new Map();
  const outbound = new Map();
  for (const edge of edges) {
    inbound.set(edge.toPageSlug, (inbound.get(edge.toPageSlug) || 0) + 1);
    outbound.set(edge.fromPageSlug, (outbound.get(edge.fromPageSlug) || 0) + 1);
  }

  const pages = [...new Set(nodes.map((node) => node.pageSlug))].sort((a, b) => a.localeCompare(b, "fr"));
  const orphanPages = pages.filter((slug) => !inbound.get(slug));
  const weakHubPages = pages.filter((slug) => (outbound.get(slug) || 0) < 2);

  return {
    nodes,
    edges,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      orphanPageCount: orphanPages.length,
      weakHubPageCount: weakHubPages.length,
    },
    orphanPages,
    weakHubPages,
  };
}

module.exports = { TOPIC_RELATIONS, buildTopicGraph };
