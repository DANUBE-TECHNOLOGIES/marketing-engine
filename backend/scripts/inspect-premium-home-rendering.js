"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const tenantSlug = argValue("tenant", "mondescale");
const referenceNeedle = argValue("reference", "Bois-Colombes");

function homeOf(site) {
  return (site.pages || []).find((page) => page.slug === "home") ||
    (site.pages || []).find((page) => page.slug === "") || null;
}

function summarizeBlock(block) {
  const content = block.content && typeof block.content === "object" ? block.content : {};
  const settings = block.settings && typeof block.settings === "object" ? block.settings : {};
  return {
    order: block.displayOrder,
    type: block.blockType,
    name: block.name || "",
    settings: JSON.stringify(settings),
    desktop: block.visibleDesktop !== false,
    mobile: block.visibleMobile !== false,
    hasImage: Boolean(content.imageUrl || content.image || content.backgroundImage || content.backgroundImageUrl),
    imageField: content.imageUrl ? "imageUrl" : content.image ? "image" : content.backgroundImage ? "backgroundImage" : content.backgroundImageUrl ? "backgroundImageUrl" : "",
  };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } });
  if (!tenant) throw new Error(`Tenant ${tenantSlug} introuvable`);

  const sites = await prisma.agencySite.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
    include: {
      pages: {
        where: { slug: { in: ["", "home"] } },
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  const referenceSite = sites.find((site) => site.name.toLowerCase().includes(referenceNeedle.toLowerCase()));
  if (!referenceSite) throw new Error(`Référence ${referenceNeedle} introuvable`);
  const referenceHome = homeOf(referenceSite);
  if (!referenceHome) throw new Error(`Home de référence introuvable pour ${referenceSite.name}`);

  console.log(`\n=== REFERENCE PREMIUM: ${referenceSite.name} ===`);
  console.table(referenceHome.blocks.map(summarizeBlock));

  for (const site of sites) {
    if (site.id === referenceSite.id) continue;
    const home = homeOf(site);
    if (!home) continue;
    console.log(`\n=== ${site.name} ===`);
    console.table(home.blocks.map(summarizeBlock));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
