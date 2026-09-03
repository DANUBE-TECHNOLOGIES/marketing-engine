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

function heroCompatibility(block) {
  if (typeOf(block) !== "hero") return -1;
  const content = asObject(block.content);
  let score = 0;

  if (content.title) score += 2;
  if (content.subtitle || content.text || content.description) score += 2;
  if (Object.prototype.hasOwnProperty.call(content, "alignment")) score += 3;
  if (Object.prototype.hasOwnProperty.call(content, "imageUrl")) score += 2;
  if (Object.prototype.hasOwnProperty.call(content, "imageAlt")) score += 1;
  if (Object.prototype.hasOwnProperty.call(content, "primaryCta")) score += 3;
  if (Object.prototype.hasOwnProperty.call(content, "secondaryCta")) score += 2;
  if (content.eyebrow) score += 1;
  if (content.city || content.agencyName || content.sitePath) score += 1;
  if (content.ctaUrl || content.ctaLabel) score -= 5;

  return score;
}

function normalizeHeroContent(block, site) {
  const content = asObject(block.content);
  const sitePath = `/agence/${site.slug}`;
  const city = String(content.city || site.agency?.city || site.city || "").trim();
  const title = content.title || site.name;
  const subtitle =
    content.subtitle ||
    content.text ||
    content.description ||
    (city ? `Votre agence de voyages à ${city}` : "Votre agence de voyages");

  const primaryCta =
    content.primaryCta ||
    (content.ctaLabel || content.ctaUrl
      ? {
          label: content.ctaLabel || "Demander un devis",
          href: content.ctaUrl || `${sitePath}/contact`,
        }
      : {
          label: "Demander un devis",
          href: `${sitePath}/contact`,
        });

  const secondaryCta =
    content.secondaryCta ||
    (city
      ? {
          label: "Découvrir l’agence",
          href: `${sitePath}/agence`,
        }
      : null);

  return {
    ...content,
    title,
    subtitle,
    eyebrow: content.eyebrow || (city ? `Agence de voyages à ${city}` : "Agence de voyages"),
    alignment: content.alignment || "left",
    imageUrl: content.imageUrl ?? null,
    imageAlt: content.imageAlt ?? null,
    primaryCta,
    secondaryCta,
  };
}

function heroNeedsNormalization(block) {
  const content = asObject(block.content);
  return !(
    Object.prototype.hasOwnProperty.call(content, "alignment") &&
    Object.prototype.hasOwnProperty.call(content, "imageUrl") &&
    Object.prototype.hasOwnProperty.call(content, "imageAlt") &&
    Object.prototype.hasOwnProperty.call(content, "primaryCta") &&
    Object.prototype.hasOwnProperty.call(content, "secondaryCta")
  );
}

function chooseHero(blocks) {
  const heroes = blocks.filter((block) => typeOf(block) === "hero");
  if (!heroes.length) return null;

  return [...heroes].sort((a, b) => {
    const scoreDiff = heroCompatibility(b) - heroCompatibility(a);
    if (scoreDiff !== 0) return scoreDiff;

    const aContent = asObject(a.content);
    const bContent = asObject(b.content);
    const aLocal = Boolean(aContent.city || aContent.agencyName || aContent.sitePath);
    const bLocal = Boolean(bContent.city || bContent.agencyName || bContent.sitePath);
    if (aLocal !== bLocal) return bLocal ? 1 : -1;

    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function chooseCta(blocks) {
  const ctas = blocks.filter((block) => typeOf(block) === "cta");
  if (!ctas.length) return null;

  return [...ctas].sort((a, b) => {
    const ao = Number(a.displayOrder ?? a.position ?? 999);
    const bo = Number(b.displayOrder ?? b.position ?? 999);
    const aBlueprint = ao === 1 ? 1 : 0;
    const bBlueprint = bo === 1 ? 1 : 0;
    if (aBlueprint !== bBlueprint) return bBlueprint - aBlueprint;

    const aContent = asObject(a.content);
    const bContent = asObject(b.content);
    const aV2 = Boolean(aContent.primaryCta || aContent.secondaryCta || aContent.primaryButton);
    const bV2 = Boolean(bContent.primaryCta || bContent.secondaryCta || bContent.primaryButton);
    if (aV2 !== bV2) return bV2 ? 1 : -1;

    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function normalizeCtaContent(block, site) {
  const content = asObject(block.content);
  const sitePath = `/agence/${site.slug}`;

  let primaryCta = content.primaryCta || null;
  if (!primaryCta && content.primaryButton) {
    primaryCta = {
      label: content.primaryButton,
      href: `${sitePath}/contact`,
    };
  }
  if (!primaryCta && (content.label || content.url)) {
    primaryCta = {
      label: content.label || "Demander un devis",
      href: content.url || `${sitePath}/contact`,
    };
  }
  if (!primaryCta && content.buttonLabel) {
    primaryCta = {
      label: content.buttonLabel,
      href: content.buttonHref || `${sitePath}/contact`,
    };
  }
  if (!primaryCta) {
    primaryCta = {
      label: "Demander un devis",
      href: `${sitePath}/contact`,
    };
  }

  return {
    ...content,
    primaryCta,
    secondaryCta: content.secondaryCta || null,
  };
}

function ctaNeedsNormalization(block) {
  const content = asObject(block.content);
  return !Object.prototype.hasOwnProperty.call(content, "primaryCta");
}

(async () => {
  const sites = await prisma.agencySite.findMany({
    orderBy: { name: "asc" },
    include: {
      agency: true,
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
        keepHero: null,
        keepCta: null,
        heroNeedsNormalization: false,
        ctaNeedsNormalization: false,
        heroContent: null,
        ctaContent: null,
        keep: [],
        remove: [],
      });
      continue;
    }

    const blocks = sortedBlocks(home.blocks || []);
    const keepHero = chooseHero(blocks);
    const keepCta = chooseCta(blocks);

    const heroBlocks = blocks.filter((block) => typeOf(block) === "hero");
    const ctaBlocks = blocks.filter((block) => typeOf(block) === "cta");

    const remove = blocks.filter(
      (block) =>
        (typeOf(block) === "hero" && block.id !== keepHero?.id) ||
        (typeOf(block) === "cta" && block.id !== keepCta?.id)
    );
    const removeIds = new Set(remove.map((block) => block.id));
    const keep = blocks.filter((block) => !removeIds.has(block.id));

    const heroNormalize = keepHero ? heroNeedsNormalization(keepHero) : false;
    const ctaNormalize = keepCta ? ctaNeedsNormalization(keepCta) : false;
    const heroContent = keepHero ? normalizeHeroContent(keepHero, site) : null;
    const ctaContent = keepCta ? normalizeCtaContent(keepCta, site) : null;

    const targetTypes = [
      "hero",
      "cta",
      "text",
      "features",
      "destination-grid",
      "services",
      "team",
      "reviews",
      "logos",
      "faq",
      "contact",
      "map",
    ];

    const targetSignature = targetTypes.join(" > ");
    const plannedSignature = signature(keep);

    const safe =
      blocks.length === 14 &&
      heroBlocks.length === 2 &&
      ctaBlocks.length === 2 &&
      Boolean(keepHero) &&
      Boolean(keepCta) &&
      remove.length === 2 &&
      keep.length === 12 &&
      plannedSignature === targetSignature;

    plans.push({
      site,
      home,
      status: safe ? "READY_TO_MIGRATE" : "REVIEW_REQUIRED",
      keepHero,
      keepCta,
      heroNeedsNormalization: heroNormalize,
      ctaNeedsNormalization: ctaNormalize,
      heroContent,
      ctaContent,
      keep,
      remove,
    });
  }

  console.log("===== MIGRATION CANONIQUE HOME V2 =====");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("");

  console.table(
    plans.map((plan) => ({
      agency: plan.site.name,
      siteStatus: plan.site.status,
      home: plan.home ? JSON.stringify(plan.home.slug) : "ABSENTE",
      before: plan.home?.blocks?.length ?? 0,
      keepHero: plan.keepHero?.id || "—",
      heroNormalize: plan.heroNeedsNormalization ? "YES" : "NO",
      keepCta: plan.keepCta?.id || "—",
      ctaNormalize: plan.ctaNeedsNormalization ? "YES" : "NO",
      remove: plan.remove.map((b) => `${typeOf(b)}:${b.id}`).join(" | ") || "—",
      after: plan.keep.length,
      status: plan.status,
    }))
  );

  console.log("\n===== SIGNATURES CIBLES =====");
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
      if (plan.status !== "READY_TO_MIGRATE" || !plan.home) continue;

      if (plan.heroNeedsNormalization) {
        await tx.pageBlock.update({
          where: { id: plan.keepHero.id },
          data: { content: plan.heroContent },
        });
      }

      if (plan.ctaNeedsNormalization) {
        await tx.pageBlock.update({
          where: { id: plan.keepCta.id },
          data: { content: plan.ctaContent },
        });
      }

      const removeIds = plan.remove.map((block) => block.id);
      await tx.pageBlock.deleteMany({
        where: { id: { in: removeIds }, pageId: plan.home.id },
      });

      const ordered = sortedBlocks(plan.keep);
      for (let index = 0; index < ordered.length; index += 1) {
        await tx.pageBlock.update({
          where: { id: ordered[index].id },
          data: { displayOrder: index },
        });
      }
    }
  });

  console.log("\nMigration appliquée. Contrôler immédiatement les homes, l’API publique et le rendu visuel.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
