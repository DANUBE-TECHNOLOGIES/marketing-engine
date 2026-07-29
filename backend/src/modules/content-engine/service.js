"use strict";

const { createKnowledgeService } = require("../../lib/knowledge/service");
const { composeDestinationContent } = require("./composer");

function createContentEngineService(prisma) {
  if (!prisma) throw new Error("Content Engine requires Prisma");
  const knowledge = createKnowledgeService(prisma);

  async function loadSite(siteSlug) {
    if (!siteSlug) return null;
    return prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { agency: true } });
  }

  async function loadRecommendations(destinationId, limit = 8) {
    if (!destinationId || !prisma.destinationRelation) return [];
    const relations = await prisma.destinationRelation.findMany({
      where: { sourceId: destinationId },
      include: { target: true },
      orderBy: { score: "desc" },
      take: Math.max(1, Math.min(Number(limit) || 8, 20)),
    });
    return relations.map((relation) => ({
      id: relation.target?.id,
      name: relation.target?.name,
      slug: relation.target?.slug,
      score: relation.score,
      reasons: relation.metadata?.reasons || [relation.relationType],
    })).filter((item) => item.id && item.slug);
  }

  async function preview({ slug, siteSlug = null, template = "destination", status = "draft", recommendationLimit = 8 }) {
    const destination = await knowledge.getDestinationKnowledge(slug);
    if (!destination) {
      const error = new Error(`Destination introuvable : ${slug}`);
      error.status = 404;
      error.code = "DESTINATION_NOT_FOUND";
      throw error;
    }
    const site = await loadSite(siteSlug);
    if (siteSlug && !site) {
      const error = new Error(`Mini-site introuvable : ${siteSlug}`);
      error.status = 404;
      error.code = "SITE_NOT_FOUND";
      throw error;
    }
    const recommendations = await loadRecommendations(destination.id, recommendationLimit);
    return composeDestinationContent({ destination, site, recommendations, template, status });
  }

  return { preview };
}

module.exports = { createContentEngineService };
