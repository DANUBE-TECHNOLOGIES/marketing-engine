"use strict";

const { validateKnowledgePayload } = require("./validators");

const INCLUDE = {
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

function createKnowledgeService(prisma) {
  if (!prisma) throw new Error("Knowledge service requires Prisma");

  async function getDestinationKnowledge(slug) {
    return prisma.destination.findUnique({ where: { slug }, include: INCLUDE });
  }

  async function upsertDestinationKnowledge(payload, { partial = false } = {}) {
    const validation = validateKnowledgePayload(payload, { partial });
    if (!validation.valid) {
      const error = new Error("Données de connaissance invalides.");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      error.details = validation.errors;
      throw error;
    }
    const input = validation.data;
    const destination = await prisma.destination.findUnique({ where: { slug: input.destinationSlug }, select: { id: true, slug: true } });
    if (!destination) {
      const error = new Error(`Destination introuvable : ${input.destinationSlug}`);
      error.code = "DESTINATION_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(input.knowledge).length) {
        await tx.destinationKnowledge.upsert({
          where: { destinationId: destination.id },
          create: { destinationId: destination.id, ...input.knowledge },
          update: { ...input.knowledge, version: { increment: 1 } },
        });
      }
      if (input.climateMonths.length) {
        for (const month of input.climateMonths) {
          await tx.destinationClimateMonth.upsert({
            where: { destinationId_month: { destinationId: destination.id, month: month.month } },
            create: { destinationId: destination.id, ...month },
            update: month,
          });
        }
      }
      if (Object.keys(input.travelProfile).length) {
        await tx.destinationTravelProfile.upsert({
          where: { destinationId: destination.id },
          create: { destinationId: destination.id, ...input.travelProfile },
          update: input.travelProfile,
        });
      }
      if (Object.keys(input.budgetProfile).length) {
        await tx.destinationBudgetProfile.upsert({
          where: { destinationId: destination.id },
          create: { destinationId: destination.id, ...input.budgetProfile },
          update: input.budgetProfile,
        });
      }
    });
    return getDestinationKnowledge(destination.slug);
  }

  async function importMany(items, { continueOnError = true } = {}) {
    if (!Array.isArray(items)) {
      const error = new Error("items doit être un tableau.");
      error.status = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }
    const results = [];
    for (const item of items) {
      try {
        const destination = await upsertDestinationKnowledge(item);
        results.push({ slug: item.destinationSlug || item.slug, status: "updated", destinationId: destination.id });
      } catch (error) {
        results.push({ slug: item?.destinationSlug || item?.slug || null, status: "failed", error: error.message, details: error.details || [] });
        if (!continueOnError) throw error;
      }
    }
    return {
      total: results.length,
      updated: results.filter((item) => item.status === "updated").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    };
  }

  return { getDestinationKnowledge, upsertDestinationKnowledge, importMany };
}

module.exports = { createKnowledgeService, INCLUDE };
