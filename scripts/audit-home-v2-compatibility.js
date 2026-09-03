"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function homeWhere() {
  return { OR: [{ slug: "home" }, { slug: "" }] };
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function heroCompatibility(block) {
  const c = asObject(block.content);
  let score = 0;
  const reasons = [];
  const legacy = [];

  if (hasOwn(c, "alignment")) { score += 3; reasons.push("alignment"); }
  if (hasOwn(c, "imageUrl")) { score += 2; reasons.push("imageUrl"); }
  if (hasOwn(c, "imageAlt")) { score += 1; reasons.push("imageAlt"); }
  if (hasOwn(c, "backgroundImage")) { score += 2; reasons.push("backgroundImage"); }
  if (hasOwn(c, "backgroundPosition")) { score += 1; reasons.push("backgroundPosition"); }
  if (hasOwn(c, "overlayOpacity")) { score += 1; reasons.push("overlayOpacity"); }
  if (hasOwn(c, "primaryCta")) { score += 3; reasons.push("primaryCta"); }
  if (hasOwn(c, "secondaryCta")) { score += 2; reasons.push("secondaryCta"); }
  if (hasOwn(c, "primaryButton")) { score += 1; reasons.push("primaryButton"); }
  if (hasOwn(c, "secondaryButton")) { score += 1; reasons.push("secondaryButton"); }
  if (hasOwn(c, "title") || hasOwn(c, "heading")) score += 1;
  if (hasOwn(c, "subtitle") || hasOwn(c, "text") || hasOwn(c, "description")) score += 1;

  if (hasOwn(c, "ctaUrl")) legacy.push("ctaUrl");
  if (hasOwn(c, "ctaLabel")) legacy.push("ctaLabel");

  return { score, reasons, legacy, keys: Object.keys(c).sort() };
}

function ctaCompatibility(block) {
  const c = asObject(block.content);
  let score = 0;
  const reasons = [];
  const legacy = [];

  if (hasOwn(c, "primaryCta")) { score += 4; reasons.push("primaryCta"); }
  if (hasOwn(c, "secondaryCta")) { score += 2; reasons.push("secondaryCta"); }
  if (hasOwn(c, "primaryButton")) { score += 2; reasons.push("primaryButton"); }
  if (hasOwn(c, "title") || hasOwn(c, "heading")) score += 1;
  if (hasOwn(c, "text") || hasOwn(c, "description")) score += 1;

  if (hasOwn(c, "url")) legacy.push("url");
  if (hasOwn(c, "label")) legacy.push("label");

  return { score, reasons, legacy, keys: Object.keys(c).sort() };
}

(async () => {
  const sites = await prisma.agencySite.findMany({
    orderBy: { name: "asc" },
    include: {
      pages: {
        where: homeWhere(),
        include: {
          blocks: {
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  console.log("===== AUDIT COMPATIBILITE RENDERER V2 — HERO / CTA =====");

  for (const site of sites) {
    const home = site.pages?.[0];
    if (!home) continue;

    const candidates = sortedBlocks(home.blocks || []).filter((b) => ["hero", "cta"].includes(typeOf(b)));

    console.log(`\n===== ${site.name} | home=${JSON.stringify(home.slug)} | status=${site.status} =====`);
    console.table(candidates.map((block) => {
      const type = typeOf(block);
      const analysis = type === "hero" ? heroCompatibility(block) : ctaCompatibility(block);
      return {
        id: block.id,
        type,
        order: Number(block.displayOrder ?? block.position ?? 0),
        status: block.status,
        v2Score: analysis.score,
        v2Signals: analysis.reasons.join(", ") || "—",
        legacySignals: analysis.legacy.join(", ") || "—",
        keys: analysis.keys.join(", "),
      };
    }));

    for (const block of candidates) {
      console.log(`\n${site.name} :: ${typeOf(block)} :: ${block.id}`);
      console.dir(block.content, { depth: null, colors: false });
    }
  }

  console.log("\nLecture seule : aucune donnée modifiée.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
