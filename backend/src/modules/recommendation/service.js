"use strict";

const { createRecommendationRepository } = require("./repository");
const { rankCandidates, DEFAULT_WEIGHTS, clamp } = require("./scoring");

function publicDestination(destination) {
  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    country: destination.countryRef?.name || destination.country,
    region: destination.regionRef?.name || destination.region || null,
    heroImageUrl: destination.heroImageUrl || null,
    tagline: destination.tagline || null,
  };
}

function createRecommendationService(prisma) {
  const repository = createRecommendationRepository(prisma);

  async function recommendBySlug(slug, options = {}) {
    const source = await repository.findBySlug(slug);
    if (!source) {
      const error = new Error(`Destination introuvable : ${slug}`);
      error.code = "DESTINATION_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    const candidates = await repository.findCandidates({ take: clamp(Number(options.candidateLimit || 500), 1, 2000) });
    const ranked = rankCandidates(source, candidates, options);
    return {
      source: publicDestination(source),
      settings: {
        limit: clamp(Number(options.limit || 8), 1, 50),
        minScore: clamp(Number(options.minScore ?? 35), 0, 100),
        weights: { ...DEFAULT_WEIGHTS, ...(options.weights || {}) },
      },
      recommendations: ranked.map((item, index) => ({
        rank: index + 1,
        destination: publicDestination(item.candidate),
        score: item.score,
        coverage: item.coverage,
        signals: item.signals,
        reasons: item.reasons,
      })),
    };
  }

  async function rebuildOne(slug, options = {}) {
    const result = await recommendBySlug(slug, options);
    const persisted = await repository.replaceAutomaticRelations(
      result.source.id,
      result.recommendations.map((item) => ({
        targetId: item.destination.id,
        score: item.score,
        coverage: item.coverage,
        signals: item.signals,
        reasons: item.reasons,
      })),
      { relationType: options.relationType || "similar" },
    );
    return { ...result, persisted: persisted.length };
  }

  async function rebuildAll(options = {}) {
    const destinations = await repository.findCandidates({ take: clamp(Number(options.destinationLimit || 500), 1, 2000) });
    const results = [];
    for (const destination of destinations) {
      try {
        const report = await rebuildOne(destination.slug, options);
        results.push({ slug: destination.slug, status: "updated", persisted: report.persisted });
      } catch (error) {
        results.push({ slug: destination.slug, status: "failed", error: error.message });
        if (options.continueOnError === false) throw error;
      }
    }
    return {
      total: results.length,
      updated: results.filter((item) => item.status === "updated").length,
      failed: results.filter((item) => item.status === "failed").length,
      persisted: results.reduce((sum, item) => sum + (item.persisted || 0), 0),
      results,
    };
  }

  return { recommendBySlug, rebuildOne, rebuildAll };
}

module.exports = { createRecommendationService, publicDestination };
