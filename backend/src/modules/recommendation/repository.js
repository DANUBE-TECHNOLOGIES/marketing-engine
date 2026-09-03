"use strict";

const DESTINATION_INCLUDE = {
  countryRef: true,
  regionRef: true,
  cityRef: true,
  knowledge: true,
  climateMonths: { orderBy: { month: "asc" } },
  travelProfile: true,
  budgetProfile: true,
  themes: { include: { theme: true }, orderBy: { weight: "desc" } },
  travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } },
  tags: { include: { tag: true } },
};

function createRecommendationRepository(prisma) {
  if (!prisma) throw new Error("Recommendation repository requires Prisma");

  return {
    findBySlug(slug) {
      return prisma.destination.findUnique({ where: { slug }, include: DESTINATION_INCLUDE });
    },
    findCandidates({ status = "published", take = 500 } = {}) {
      return prisma.destination.findMany({ where: { status }, include: DESTINATION_INCLUDE, take, orderBy: { slug: "asc" } });
    },
    async replaceAutomaticRelations(sourceId, ranked, { relationType = "similar" } = {}) {
      return prisma.$transaction(async (tx) => {
        await tx.destinationRelation.deleteMany({
          where: { sourceId, relationType, origin: "recommendation-engine" },
        });
        const created = [];
        for (const item of ranked) {
          created.push(await tx.destinationRelation.create({
            data: {
              sourceId,
              targetId: item.targetId,
              relationType,
              score: item.score,
              origin: "recommendation-engine",
              metadata: { coverage: item.coverage, signals: item.signals, reasons: item.reasons },
            },
          }));
        }
        return created;
      });
    },
  };
}

module.exports = { createRecommendationRepository, DESTINATION_INCLUDE };
