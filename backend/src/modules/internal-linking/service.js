"use strict";

const { scoreDestinationPair } = require("./scoring");
const { destinationAnchors, selectAnchor } = require("./anchors");

function destinationFromPage(page) {
  const values = [page.slug, page.title, page.h1].filter(Boolean).map(value => String(value).toLowerCase());
  return destination => values.includes(String(destination.slug || "").toLowerCase()) || values.includes(String(destination.name || "").toLowerCase());
}

class InternalLinkingService {
  constructor(repository) { this.repository = repository; }

  async health() {
    return { ok: true, version: "1.0.0", capability: "internal-linking-intelligence" };
  }

  rank(source, destinations, options = {}) {
    const limit = Math.max(1, Math.min(Number(options.limit) || 12, 50));
    const minScore = Math.max(0, Math.min(Number(options.minScore) || 15, 100));
    return destinations
      .map(target => ({ target, analysis: scoreDestinationPair(source, target, options) }))
      .filter(item => item.analysis && item.analysis.score >= minScore)
      .sort((a, b) => b.analysis.score - a.analysis.score || a.target.name.localeCompare(b.target.name, "fr"))
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        target: {
          id: item.target.id,
          slug: item.target.slug,
          name: item.target.name,
          country: item.target.country,
          url: `/destinations/${item.target.slug}`
        },
        anchor: selectAnchor(item.target, { sourceId: source.id }),
        anchorVariants: destinationAnchors(item.target),
        ...item.analysis
      }));
  }

  async suggestionsForDestination(identifier, options = {}) {
    const source = options.by === "id"
      ? await this.repository.findDestinationById(identifier)
      : await this.repository.findDestinationBySlug(identifier);
    if (!source) {
      const error = new Error("Destination introuvable");
      error.status = 404;
      throw error;
    }
    const destinations = await this.repository.listDestinations({ includeDrafts: Boolean(options.includeDrafts) });
    return { source: { id: source.id, slug: source.slug, name: source.name }, links: this.rank(source, destinations, options) };
  }

  async suggestionsForPage(pageId, options = {}) {
    const page = await this.repository.findPage(pageId);
    if (!page) {
      const error = new Error("Page introuvable");
      error.status = 404;
      throw error;
    }
    const destinations = await this.repository.listDestinations({ includeDrafts: Boolean(options.includeDrafts) });
    const source = destinations.find(destinationFromPage(page));
    if (!source) {
      return {
        page: { id: page.id, slug: page.slug, title: page.title },
        source: null,
        links: [],
        warning: "Aucune destination correspondante n'a été trouvée pour cette page."
      };
    }
    const result = this.rank(source, destinations, options);
    return { page: { id: page.id, slug: page.slug, title: page.title }, source: { id: source.id, slug: source.slug, name: source.name }, links: result };
  }

  async rebuild(options = {}) {
    const destinations = await this.repository.listDestinations({ includeDrafts: Boolean(options.includeDrafts) });
    const perSource = Math.max(1, Math.min(Number(options.perSource) || 12, 30));
    const minScore = Math.max(0, Math.min(Number(options.minScore) || 15, 100));
    let persisted = 0;
    const summaries = [];

    for (const source of destinations) {
      const links = this.rank(source, destinations, { ...options, limit: perSource, minScore });
      if (options.replace !== false) await this.repository.deleteComputedRelations(source.id);
      if (options.persist !== false) {
        for (const link of links) {
          await this.repository.upsertComputedRelation(source.id, link.target.id, link.score, {
            reasons: link.reasons,
            components: link.components,
            anchor: link.anchor,
            anchorVariants: link.anchorVariants,
            distanceKm: link.distanceKm,
            generatedAt: new Date().toISOString()
          });
          persisted += 1;
        }
      }
      summaries.push({ sourceId: source.id, slug: source.slug, count: links.length });
    }

    return { destinations: destinations.length, persisted, perSource, minScore, summaries };
  }

  async graph(options = {}) {
    const destinations = await this.repository.listDestinations({ includeDrafts: Boolean(options.includeDrafts) });
    const nodeMap = new Map(destinations.map(item => [item.id, { id: item.id, slug: item.slug, label: item.name, country: item.country }]));
    const edges = [];
    for (const source of destinations) {
      for (const link of this.rank(source, destinations, options)) {
        edges.push({ source: source.id, target: link.target.id, score: link.score, anchor: link.anchor, reasons: link.reasons });
      }
    }
    return { nodes: [...nodeMap.values()], edges };
  }
}

module.exports = { InternalLinkingService, destinationFromPage };
