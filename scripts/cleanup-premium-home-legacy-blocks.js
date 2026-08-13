"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function homeWhere() {
  return {
    OR: [
      { slug: "home" },
      { slug: "" },
    ],
  };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function typeOf(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function isLegacyHero(block) {
  if (typeOf(block) !== "hero") return false;
  const content = asObject(block.content);
  return Boolean(content.ctaUrl || content.ctaLabel) && !content.primaryCta && !content.secondaryCta;
}

function isCanonicalHero(block) {
  if (typeOf(block) !== "hero") return false;
  const content = asObject(block.content);
  return (
    Object.prototype.hasOwnProperty.call(content, "alignment") ||
    Object.prototype.hasOwnProperty.call(content, "imageUrl") ||
    Object.prototype.hasOwnProperty.call(content, "imageAlt") ||
    Object.prototype.hasOwnProperty.call(content, "primaryCta") ||
    Object.prototype.hasOwnProperty.call(content, "secondaryCta")
  );
}

function isLegacyCta(block) {
  if (typeOf(block) !== "cta") return false;
  const content = asObject(block.content);
  return Boolean(content.url || content.label) && !content.primaryCta && !content.secondaryCta;
}

function isCanonicalCta(block) {
  if (typeOf(block) !== "cta") return false;
  const content = asObject(block.content);
  return Boolean(content.primaryCta || content.secondaryCta || content.primaryButton);
}

function sortedBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    const ao = Number(a.displayOrder ?? a.position ?? 0);
    const bo = Number(b.displayOrder ?? b.position ?? 0);
    return ao - bo || String(a.id).localeCompare(String(b.id));
  });
}

function signature(blocks) {
  return sortedBlocks(blocks).map(typeOf).join(" > ");
}

(async () => {
  const sites = await prisma.agencySite.findMany({
    orderBy: { name: "asc" },
    include: {
      pages: {
        where: homeWhere(),
        include: {
          blocks: {
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" },
            ],
          },
        },
      },
    },
  });

  const plans = [];

  for (const site of sites) {
    const home = site.pages?.[0] || null;
    if (!home) {
      plans.push({
        site,
        home: null,
        status: "HOME_ABSENTE",
        legacyHero: [],
        legacyCta: [],
        canonicalHero: [],
        canonicalCta: [],
        keep: [],
        remove: [],
      });
      continue;
    }

    const blocks = sortedBlocks(home.blocks || []);
    const legacyHero = blocks.filter(isLegacyHero);
    const legacyCta = blocks.filter(isLegacyCta);
    const canonicalHero = blocks.filter(isCanonicalHero);
    const canonicalCta = blocks.filter(isCanonicalCta);
    const removeIds = new Set([...legacyHero, ...legacyCta].map((block) => block.id));
    const keep = blocks.filter((block) => !removeIds.has(block.id));

    const safe =
      blocks.length === 14 &&
      legacyHero.length === 1 &&
      legacyCta.length === 1 &&
      canonicalHero.length === 1 &&
      canonicalCta.length === 1 &&
      keep.length === 12;

    plans.push({
      site,
      home,
      status: safe ? "READY_TO_CLEAN" : "REVIEW_REQUIRED",
      legacyHero,
      legacyCta,
      canonicalHero,
      canonicalCta,
      keep,
      remove: [...legacyHero, ...legacyCta],
    });
  }

  console.log("===== NETTOYAGE BLOCS LEGACY HOME =====");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("");

  console.table(
    plans.map((plan) => ({
      agency: plan.site.name,
      siteStatus: plan.site.status,
      home: plan.home ? JSON.stringify(plan.home.slug) : "ABSENTE",
      before: plan.home?.blocks?.length ?? 0,
      legacyHero: plan.legacyHero.map((b) => b.id).join(", ") || "—",
      legacyCta: plan.legacyCta.map((b) => b.id).join(", ") || "—",
      canonicalHero: plan.canonicalHero.map((b) => b.id).join(", ") || "—",
      canonicalCta: plan.canonicalCta.map((b) => b.id).join(", ") || "—",
      after: plan.keep.length,
      status: plan.status,
    }))
  );

  console.log("\n===== SIGNATURES APRES NETTOYAGE =====");
  for (const plan of plans) {
    if (!plan.home) continue;
    console.log(`${plan.site.name}: ${signature(plan.keep)}`);
  }

  const unsafe = plans.filter((plan) => plan.status === "REVIEW_REQUIRED");
  if (unsafe.length) {
    console.log(`\n${unsafe.length} agence(s) nécessitent une revue. Aucune écriture effectuée.`);
    process.exitCode = 2;
    return;
  }

  if (!APPLY) {
    console.log("\nAucune donnée modifiée. Relancer avec --apply uniquement après validation du tableau ci-dessus.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.status !== "READY_TO_CLEAN" || !plan.home) continue;

      const removeIds = plan.remove.map((block) => block.id);
      if (removeIds.length) {
        await tx.agencySiteBlock.deleteMany({
          where: {
            id: { in: removeIds },
            pageId: plan.home.id,
          },
        });
      }

      for (let index = 0; index < plan.keep.length; index += 1) {
        await tx.agencySiteBlock.update({
          where: { id: plan.keep[index].id },
          data: { displayOrder: index },
        });
      }
    }
  });

  console.log("\nNettoyage appliqué. Contrôler immédiatement les homes et le rendu public.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
