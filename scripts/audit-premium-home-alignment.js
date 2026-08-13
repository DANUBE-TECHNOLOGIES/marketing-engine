"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const REFERENCE_SLUG = "ambassade-fram-mondescale-bois-colombes";

function homeWhere() {
  return {
    OR: [
      { slug: "home" },
      { slug: "" },
    ],
  };
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function blockPosition(block, fallback) {
  const value = block?.displayOrder ?? block?.position;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function signature(blocks) {
  return blocks.map(blockType).join(" > ");
}

function compareTypes(reference, candidate) {
  const max = Math.max(reference.length, candidate.length);
  const differences = [];
  for (let index = 0; index < max; index += 1) {
    const expected = reference[index] || "∅";
    const actual = candidate[index] || "∅";
    if (expected !== actual) differences.push(`${index}:${expected}→${actual}`);
  }
  return differences;
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

  const referenceSite = sites.find((site) => site.slug === REFERENCE_SLUG);
  const referenceHome = referenceSite?.pages?.[0] || null;
  if (!referenceHome) throw new Error("Home de référence Bois-Colombes introuvable.");

  const referenceBlocks = referenceHome.blocks || [];
  const referenceTypes = referenceBlocks.map(blockType);
  const referencePositions = referenceBlocks.map(blockPosition);

  console.log("===== AUDIT ALIGNEMENT HOMES PREMIUM =====");
  console.log(`Référence: ${referenceSite.name}`);
  console.log(`Blocks: ${referenceBlocks.length}`);
  console.log(`Signature: ${signature(referenceBlocks)}`);
  console.log(`Positions dupliquées référence: ${duplicateValues(referencePositions).join(", ") || "aucune"}`);
  console.log("");

  const rows = sites.map((site) => {
    const home = site.pages?.[0] || null;
    if (!home) {
      return {
        agency: site.name,
        siteStatus: site.status,
        home: "ABSENTE",
        blocks: 0,
        typeMatch: false,
        duplicatePositions: "—",
        duplicateTypes: "—",
        differences: "home absente",
      };
    }

    const blocks = home.blocks || [];
    const types = blocks.map(blockType);
    const positions = blocks.map(blockPosition);
    const differences = compareTypes(referenceTypes, types);

    return {
      agency: site.name,
      siteStatus: site.status,
      home: JSON.stringify(home.slug),
      blocks: blocks.length,
      typeMatch: differences.length === 0,
      duplicatePositions: duplicateValues(positions).join(", ") || "aucune",
      duplicateTypes: duplicateValues(types).join(", ") || "aucun",
      differences: differences.join(" | ") || "—",
    };
  });

  console.table(rows);

  console.log("\n===== DETAILS PAR AGENCE =====");
  for (const site of sites) {
    const home = site.pages?.[0] || null;
    if (!home) continue;
    const blocks = home.blocks || [];
    console.log(`\n${site.name}`);
    console.table(
      blocks.map((block, index) => ({
        index,
        id: block.id,
        type: blockType(block),
        displayOrder: blockPosition(block, index),
        status: block.status,
      }))
    );
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
