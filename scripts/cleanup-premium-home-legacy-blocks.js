"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function homeWhere() {
  return { OR: [{ slug: "home" }, { slug: "" }] };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function typeOf(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function orderOf(block) {
  return Number(block?.displayOrder ?? block?.position ?? 0);
}

function sortedBlocks(blocks) {
  return [...blocks].sort((a, b) => orderOf(a) - orderOf(b) || String(a.id).localeCompare(String(b.id)));
}

function hasAny(content, keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(content, key));
}

function heroRank(block, site) {
  if (typeOf(block) !== "hero") return -Infinity;
  const content = asObject(block.content);
  let score = 0;
  if (hasAny(content, ["alignment", "imageUrl", "imageAlt", "backgroundImage", "backgroundPosition"])) score += 100;
  if (content.primaryCta || content.secondaryCta) score += 70;
  if (content.eyebrow) score += 15;
  if (content.title === site.name) score += 20;
  if (String(content.ctaUrl || "").includes(site.slug)) score += 10;
  if (content.ctaUrl || content.ctaLabel) score -= 25;
  if (String(content.title || "").toLowerCase().includes(String(site.name || "").toLowerCase())) score += 5;
  return score;
}

function chooseHero(heroes, site) {
  return [...heroes]
    .sort((a, b) => heroRank(b, site) - heroRank(a, site) || orderOf(a) - orderOf(b) || String(a.id).localeCompare(String(b.id)))[0] || null;
}

function ctaRank(block) {
  if (typeOf(block) !== "cta") return -Infinity;
  const content = asObject(block.content);
  let score = 0;
  if (content.primaryCta || content.secondaryCta || content.primaryButton) score += 100;
  if (orderOf(block) === 1) score += 60;
  if (content.url || content.label) score += 20;
  if (content.buttonHref || content.buttonLabel) score += 15;
  if (Array.isArray(content.actions) && content.actions.length) score += 10;
  return score;
}

function chooseCta(ctas) {
  return [...ctas]
    .sort((a, b) => ctaRank(b) - ctaRank(a) || orderOf(a) - orderOf(b) || String(a.id).localeCompare(String(b.id)))[0] || null;
}

function normalizeHeroContent(block, site) {
  const content = asObject(block.content);
  if (content.primaryCta || content.secondaryCta || hasAny(content, ["alignment", "imageUrl", "imageAlt", "backgroundImage"])) {
    return content;
  }

  return {
    title: content.title || site.name,
    eyebrow: content.eyebrow || null,
    imageAlt: content.imageAlt || null,
    imageUrl: content.imageUrl || null,
    subtitle: content.subtitle || content.text || `Votre agence de voyages à ${site.agency?.city || site.name}`,
    alignment: content.alignment || "left",
    primaryCta: content.ctaUrl || content.ctaLabel
      ? {
          href: content.ctaUrl || `/agence/${site.slug}/contact`,
          label: content.ctaLabel || "Demander un devis",
        }
      : null,
    secondaryCta: null,
  };
}

function normalizeCtaContent(block) {
  const content = asObject(block.content);
  if (content.primaryCta || content.secondaryCta || content.primaryButton) return content;

  const actions = Array.isArray(content.actions) ? content.actions : [];
  const firstAction = actions[0] || null;
  const secondAction = actions[1] || null;
  const href = content.url || content.buttonHref || firstAction?.href || "contact";
  const label = content.label || content.buttonLabel || firstAction?.label || "Demander un devis";

  return {
    title: content.title || "Construisons votre prochain voyage",
    text: content.text || null,
    style: content.style || "primary",
    primaryCta: { href, label },
    secondaryCta: secondAction?.label ? { href: secondAction.href || "contact", label: secondAction.label } : null,
  };
}

function signature(blocks) {
  return sortedBlocks(blocks).map(typeOf).join(" > ");
}

(async () => {
  const sites = await prisma.agencySite.findMany({
    orderBy: { name: "asc" },
    include: {
      agency: true,
      pages: {
        where: homeWhere(),
        include: {
          blocks: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
        },
      },
    },
  });

  const plans = [];

  for (const site of sites) {
    const home = site.pages?.[0] || null;
    if (!home) {
      plans.push({ site, home: null, status: "HOME_ABSENTE", keep: [], remove: [] });
      continue;
    }

    const blocks = sortedBlocks(home.blocks || []);
    const heroes = blocks.filter((block) => typeOf(block) === "hero");
    const ctas = blocks.filter((block) => typeOf(block) === "cta");
    const keepHero = chooseHero(heroes, site);
    const keepCta = chooseCta(ctas);
    const remove = blocks.filter((block) =>
      (typeOf(block) === "hero" && block.id !== keepHero?.id) ||
      (typeOf(block) === "cta" && block.id !== keepCta?.id)
    );
    const removeIds = new Set(remove.map((block) => block.id));
    const keep = blocks.filter((block) => !removeIds.has(block.id));
    const heroContent = keepHero ? normalizeHeroContent(keepHero, site) : null;
    const ctaContent = keepCta ? normalizeCtaContent(keepCta) : null;
    const targetSignature = "hero > cta > text > features > destination-grid > services > team > reviews > logos > faq > contact > map";
    const safe =
      blocks.length === 14 &&
      heroes.length === 2 &&
      ctas.length === 2 &&
      Boolean(keepHero) &&
      Boolean(keepCta) &&
      remove.length === 2 &&
      keep.length === 12 &&
      signature(keep) === targetSignature;

    plans.push({
      site,
      home,
      status: safe ? "READY_TO_MIGRATE" : "REVIEW_REQUIRED",
      keepHero,
      keepCta,
      heroNeedsNormalization: keepHero ? JSON.stringify(asObject(keepHero.content)) !== JSON.stringify(heroContent) : false,
      ctaNeedsNormalization: keepCta ? JSON.stringify(asObject(keepCta.content)) !== JSON.stringify(ctaContent) : false,
      heroContent,
      ctaContent,
      remove,
      keep,
    });
  }

  console.log("===== MIGRATION CANONIQUE HOME V2 =====");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("");

  console.table(plans.map((plan) => ({
    agency: plan.site.name,
    siteStatus: plan.site.status,
    home: plan.home ? JSON.stringify(plan.home.slug) : "ABSENTE",
    before: plan.home?.blocks?.length ?? 0,
    keepHero: plan.keepHero?.id || "—",
    heroNormalize: plan.heroNeedsNormalization ? "YES" : "NO",
    keepCta: plan.keepCta?.id || "—",
    ctaNormalize: plan.ctaNeedsNormalization ? "YES" : "NO",
    remove: plan.remove?.map((b) => `${typeOf(b)}:${b.id}`).join(" | ") || "—",
    after: plan.keep?.length ?? 0,
    status: plan.status,
  })));

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
        await tx.agencySiteBlock.update({
          where: { id: plan.keepHero.id },
          data: { content: plan.heroContent },
        });
      }

      if (plan.ctaNeedsNormalization) {
        await tx.agencySiteBlock.update({
          where: { id: plan.keepCta.id },
          data: { content: plan.ctaContent },
        });
      }

      const removeIds = plan.remove.map((block) => block.id);
      await tx.agencySiteBlock.deleteMany({
        where: { id: { in: removeIds }, pageId: plan.home.id },
      });

      const ordered = sortedBlocks(plan.keep);
      for (let index = 0; index < ordered.length; index += 1) {
        await tx.agencySiteBlock.update({
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
