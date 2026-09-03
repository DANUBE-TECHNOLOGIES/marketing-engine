"use strict";

const NODE_TYPES = Object.freeze({
  CONTINENT: "continent",
  COUNTRY: "country",
  REGION: "region",
  CITY: "city",
  DESTINATION: "destination",
  THEME: "theme",
  TRAVEL_TYPE: "travel-type",
  TAG: "tag",
  PAGE: "page",
});

function nodeId(type, id) {
  return `${type}:${id}`;
}

function addNode(map, node) {
  const id = nodeId(node.type, node.id);
  if (!map.has(id)) map.set(id, { ...node, graphId: id });
  return id;
}

function addEdge(edges, source, target, relation, metadata) {
  if (!source || !target || source === target) return;
  const key = `${source}|${relation}|${target}`;
  if (edges.some((edge) => edge.key === key)) return;
  edges.push({ key, source, target, relation, ...(metadata ? { metadata } : {}) });
}

function normaliseContinent(value) {
  const label = String(value || "").trim();
  return label ? { id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title: label } : null;
}

function buildContentGraph({ countries = [], regions = [], cities = [], destinations = [], themes = [], travelTypes = [], tags = [], pages = [] } = {}) {
  const nodes = new Map();
  const edges = [];

  for (const country of countries) {
    const countryGraphId = addNode(nodes, { id: country.id, type: NODE_TYPES.COUNTRY, slug: country.slug, title: country.name, status: country.status, metadata: country.metadata || null });
    const continent = normaliseContinent(country.continent);
    if (continent) {
      const continentGraphId = addNode(nodes, { ...continent, type: NODE_TYPES.CONTINENT, slug: continent.id, status: "published" });
      addEdge(edges, continentGraphId, countryGraphId, "contains");
      addEdge(edges, countryGraphId, continentGraphId, "belongs-to");
    }
  }

  for (const region of regions) {
    const regionGraphId = addNode(nodes, { id: region.id, type: NODE_TYPES.REGION, slug: region.slug, title: region.name, status: region.status, metadata: region.metadata || null });
    const countryGraphId = region.countryId ? nodeId(NODE_TYPES.COUNTRY, region.countryId) : null;
    if (nodes.has(countryGraphId)) {
      addEdge(edges, countryGraphId, regionGraphId, "contains");
      addEdge(edges, regionGraphId, countryGraphId, "belongs-to");
    }
  }

  for (const city of cities) {
    const cityGraphId = addNode(nodes, { id: city.id, type: NODE_TYPES.CITY, slug: city.slug, title: city.name, status: city.status, metadata: city.metadata || null });
    const parentGraphId = city.regionId ? nodeId(NODE_TYPES.REGION, city.regionId) : nodeId(NODE_TYPES.COUNTRY, city.countryId);
    if (nodes.has(parentGraphId)) {
      addEdge(edges, parentGraphId, cityGraphId, "contains");
      addEdge(edges, cityGraphId, parentGraphId, "belongs-to");
    }
  }

  for (const theme of themes) addNode(nodes, { id: theme.id, type: NODE_TYPES.THEME, slug: theme.slug, title: theme.name, status: theme.status, metadata: theme.metadata || null });
  for (const travelType of travelTypes) addNode(nodes, { id: travelType.id, type: NODE_TYPES.TRAVEL_TYPE, slug: travelType.slug, title: travelType.name, status: travelType.status, metadata: travelType.metadata || null });
  for (const tag of tags) addNode(nodes, { id: tag.id, type: NODE_TYPES.TAG, slug: tag.slug, title: tag.name, status: tag.status, metadata: tag.metadata || null });

  for (const destination of destinations) {
    addNode(nodes, { id: destination.id, type: NODE_TYPES.DESTINATION, slug: destination.slug, title: destination.name, status: destination.status, metadata: destination.metadata || null });
  }

  for (const destination of destinations) {
    const destinationGraphId = nodeId(NODE_TYPES.DESTINATION, destination.id);
    const parentCandidates = [
      destination.cityId && nodeId(NODE_TYPES.CITY, destination.cityId),
      destination.regionId && nodeId(NODE_TYPES.REGION, destination.regionId),
      destination.countryId && nodeId(NODE_TYPES.COUNTRY, destination.countryId),
    ].filter(Boolean);
    const parentGraphId = parentCandidates.find((candidate) => nodes.has(candidate));
    if (parentGraphId) {
      addEdge(edges, parentGraphId, destinationGraphId, "contains");
      addEdge(edges, destinationGraphId, parentGraphId, "belongs-to");
    }
    for (const item of destination.themes || []) {
      const target = nodeId(NODE_TYPES.THEME, item.themeId || item.theme?.id);
      if (nodes.has(target)) addEdge(edges, destinationGraphId, target, "has-theme", { weight: item.weight ?? 100 });
    }
    for (const item of destination.travelTypes || []) {
      const target = nodeId(NODE_TYPES.TRAVEL_TYPE, item.travelTypeId || item.travelType?.id);
      if (nodes.has(target)) addEdge(edges, destinationGraphId, target, "has-travel-type", { weight: item.weight ?? 100 });
    }
    for (const item of destination.tags || []) {
      const target = nodeId(NODE_TYPES.TAG, item.tagId || item.tag?.id);
      if (nodes.has(target)) addEdge(edges, destinationGraphId, target, "has-tag");
    }
    for (const relation of destination.relationsFrom || []) {
      const target = nodeId(NODE_TYPES.DESTINATION, relation.targetId || relation.target?.id);
      if (nodes.has(target)) addEdge(edges, destinationGraphId, target, relation.relationType || "related-to", { score: relation.score ?? 50, origin: relation.origin || "manual" });
    }
  }

  for (const page of pages) {
    const pageGraphId = addNode(nodes, { id: page.id, type: NODE_TYPES.PAGE, slug: page.slug, title: page.title, status: page.status, metadata: { path: page.path, pageType: page.pageType, siteId: page.siteId, published: page.published } });
    const destination = destinations.find((item) => item.slug === page.slug);
    if (destination) {
      const destinationGraphId = nodeId(NODE_TYPES.DESTINATION, destination.id);
      addEdge(edges, pageGraphId, destinationGraphId, "represents");
      addEdge(edges, destinationGraphId, pageGraphId, "rendered-by");
    }
    if (page.parentId) {
      const parent = nodeId(NODE_TYPES.PAGE, page.parentId);
      if (nodes.has(parent)) addEdge(edges, parent, pageGraphId, "contains");
    }
  }

  const cleanEdges = edges.map(({ key, ...edge }) => edge);
  const degree = {};
  for (const node of nodes.values()) degree[node.graphId] = { incoming: 0, outgoing: 0 };
  for (const edge of cleanEdges) {
    if (degree[edge.source]) degree[edge.source].outgoing += 1;
    if (degree[edge.target]) degree[edge.target].incoming += 1;
  }

  const items = [...nodes.values()].map((node) => ({ ...node, degree: degree[node.graphId] }));
  const byType = items.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {});
  return { version: "1.0", summary: { nodes: items.length, edges: cleanEdges.length, byType }, nodes: items, edges: cleanEdges };
}

function getNodeNeighborhood(graph, graphId, depth = 1) {
  const maxDepth = Math.max(0, Math.min(Number(depth) || 1, 3));
  const visited = new Set([graphId]);
  let frontier = new Set([graphId]);
  for (let level = 0; level < maxDepth; level += 1) {
    const next = new Set();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !visited.has(edge.target)) next.add(edge.target);
      if (frontier.has(edge.target) && !visited.has(edge.source)) next.add(edge.source);
    }
    for (const id of next) visited.add(id);
    frontier = next;
  }
  return {
    root: graph.nodes.find((node) => node.graphId === graphId) || null,
    nodes: graph.nodes.filter((node) => visited.has(node.graphId)),
    edges: graph.edges.filter((edge) => visited.has(edge.source) && visited.has(edge.target)),
  };
}

module.exports = { NODE_TYPES, buildContentGraph, getNodeNeighborhood, nodeId };
