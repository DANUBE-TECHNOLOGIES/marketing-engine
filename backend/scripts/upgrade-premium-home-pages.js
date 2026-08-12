"use strict";

const { PrismaClient } = require("@prisma/client");
const ContentBuilder = require("../src/modules/agency-site/builders/content-builder");
const { isLegacyHomeCandidate, buildPremiumHomePlan } = require("../src/modules/agency-site/premium-home-blueprint");

const prisma = new PrismaClient();
const builder = new ContentBuilder();

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const apply = process.argv.includes("--apply");
const tenantSlug = argValue("tenant", "mondescale");
const referenceNeedle = argValue("reference", "Bois-Colombes");

function homeOf(site) {
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  return pages.find((page) => page.slug === "home") || pages.find((page) => page.slug === "") || null;
}

async function nextVersion(pageId, tx = prisma) {
  const latest = await tx.agencySitePageVersion.findFirst({ where: { pageId }, orderBy: { version: "desc" }, select: { version: true } });
  return Number(latest?.version || 0) + 1;
}

async function snapshotPage(tx, page, reason) {
  const version = await nextVersion(page.id, tx);
  await tx.agencySitePageVersion.create({
    data: {
      pageId: page.id,
      version,
      reason,
      createdBy: "script:upgrade-premium-home-pages",
      snapshot: {
        page: {
          title: page.title,
          slug: page.slug,
          path: page.path,
          pageType: page.pageType,
          status: page.status,
          published: page.published,
        },
        sections: page.sections,
        blocks: page.blocks,
      },
    },
  });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, slug: true } });
  if (!tenant) throw new Error(`Tenant ${tenantSlug} introuvable`);

  const sites = await prisma.agencySite.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
    include: {
      agency: true,
      pages: {
        where: { slug: { in: ["", "home"] } },
        include: { sections: { orderBy: { displayOrder: "asc" } }, blocks: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  const referenceSite = sites.find((site) => `${site.name} ${site.agency?.name || ""}`.toLowerCase().includes(referenceNeedle.toLowerCase()));
  if (!referenceSite) throw new Error(`Agence de référence contenant « ${referenceNeedle} » introuvable`);
  const referenceHome = homeOf(referenceSite);
  if (!referenceHome) throw new Error(`Home de référence introuvable pour ${referenceSite.name}`);
  if (!referenceHome.blocks?.length) throw new Error(`La home de référence ${referenceSite.name} ne contient aucun Block V2`);

  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Référence premium: ${referenceSite.name} (${referenceHome.blocks.length} blocks V2)`);

  const report = [];
  for (const site of sites) {
    if (site.id === referenceSite.id) {
      report.push({ agency: site.name, status: "REFERENCE", blocks: referenceHome.blocks.length });
      continue;
    }
    const page = homeOf(site);
    if (!page) {
      report.push({ agency: site.name, status: "NO_HOME" });
      continue;
    }
    if (!isLegacyHomeCandidate(page)) {
      report.push({ agency: site.name, status: "SKIP_ALREADY_V2", blocks: page.blocks.length });
      continue;
    }

    const generatedSections = builder.build(page, site.agency, site).map((section) => ({
      sectionType: section.sectionType,
      jsonContent: section.content,
      displayOrder: section.displayOrder,
      status: "draft",
    }));
    const plan = buildPremiumHomePlan({
      referenceBlocks: referenceHome.blocks,
      targetBlocks: page.blocks,
      targetSections: page.sections,
      generatedSections,
    });

    if (!plan.ready) {
      report.push({ agency: site.name, status: `BLOCKED_${plan.reason}`, missing: plan.missingTypes.join(",") });
      continue;
    }

    if (apply) {
      await prisma.$transaction(async (tx) => {
        await snapshotPage(tx, page, `Before premium-home upgrade from ${referenceSite.name}`);
        await tx.pageBlock.deleteMany({ where: { pageId: page.id } });
        for (const block of plan.blocks) {
          await tx.pageBlock.create({ data: { pageId: page.id, ...block } });
        }
      });
    }
    report.push({ agency: site.name, status: apply ? "UPGRADED" : "READY_TO_UPGRADE", blocks: plan.blocks.length });
  }

  console.table(report);
  const blocked = report.filter((item) => String(item.status).startsWith("BLOCKED_") || item.status === "NO_HOME");
  if (blocked.length) {
    console.log(`\n${blocked.length} agence(s) nécessitent une correction avant migration.`);
    process.exitCode = 2;
  }
  if (!apply) console.log("\nAucune donnée modifiée. Relancer avec --apply uniquement après validation du tableau ci-dessus.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
