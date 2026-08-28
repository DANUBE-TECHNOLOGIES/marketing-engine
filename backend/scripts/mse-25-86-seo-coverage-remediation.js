"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const TARGETS = Object.freeze([
  { city: "Ozoir la Ferrière", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Maurepas", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Nevers", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Dax", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Gien", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Bois-Colombes", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Lamorlaye", home: ["home", "accueil", "index", ""], services: ["services"], contact: ["contact"], localContext: false },
  { city: "Melun", home: ["accueil", "home", "index", ""], services: ["services"], contact: ["contact"], localContext: true },
  { city: "Amilly", home: ["accueil", "home", "index", ""], services: ["services"], contact: ["contact"], localContext: true },
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function explicitTrue(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function pageByCandidates(pages, candidates) {
  const normalized = new Set(candidates.map(normalize));
  return (pages || []).find((page) => normalized.has(normalize(page?.slug))) || null;
}

function blockContent(block) {
  const value = block?.content;
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function headingKey(content) {
  return ["h1", "heading", "title", "headline"].find((key) => typeof content?.[key] === "string" && content[key].trim()) || null;
}

function isHero(block) {
  const type = normalize(block?.blockType || block?.type).replace(/\s+/g, "-");
  return ["hero", "hero-banner", "hero-section"].includes(type);
}

function headingBlock(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const hero = blocks.find((block) => isHero(block) && headingKey(blockContent(block)));
  if (hero) return hero;
  return blocks.find((block) => headingKey(blockContent(block))) || null;
}

function descriptiveStringKey(content) {
  return ["subtitle", "subTitle", "description", "text", "body", "paragraph", "intro", "content"]
    .find((key) => typeof content?.[key] === "string" && content[key].trim()) || null;
}

function descriptiveBlock(page) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const hero = blocks.find((block) => {
    const content = blockContent(block);
    return isHero(block) && descriptiveStringKey(content);
  });
  if (hero) return hero;
  return blocks.find((block) => descriptiveStringKey(blockContent(block))) || null;
}

function homeSeo(city) {
  return {
    seoTitle: `Agence de voyages à ${city} | Conseils, sur mesure, séjours, circuits, croisières`,
    metaDescription: `À ${city}, notre agence de voyages vous conseille et vous accompagne pour vos voyages sur mesure, séjours, circuits et croisières. Contact et rendez-vous en agence.`,
    h1: `Agence de voyages à ${city} : conseils, sur mesure, séjours, circuits et croisières`,
  };
}

function servicesSeo(city) {
  return {
    seoTitle: `Services de voyage à ${city} | Billetterie, vols et sur mesure`,
    metaDescription: `Billetterie et vols à ${city}, voyages sur mesure, séjours, circuits et croisières : bénéficiez des conseils de votre agence de voyages locale.`,
    h1: `Billetterie, vols et services de voyage à ${city}`,
  };
}

function contactSeo(city) {
  return {
    seoTitle: `Contact et rendez-vous | Agence de voyages à ${city}`,
    metaDescription: `Contactez votre agence de voyages à ${city} pour un rendez-vous, un conseil voyage ou l’accompagnement de votre prochain projet.`,
    h1: `Contact et rendez-vous avec votre agence de voyages à ${city}`,
  };
}

function localContextSentence(city) {
  return `Agence de proximité à ${city}, nous accompagnons les voyageurs du secteur et des alentours avec un conseil local, personnalisé et disponible en agence.`;
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function updatePageSeo(tx, page, desired, snapshots, changes, dryRun) {
  if (!page) return;
  snapshots.push({
    type: "page",
    id: page.id,
    slug: page.slug,
    seoTitle: page.seoTitle || null,
    metaDescription: page.metaDescription || null,
  });

  const pageData = {};
  if (page.seoTitle !== desired.seoTitle) pageData.seoTitle = desired.seoTitle;
  if (page.metaDescription !== desired.metaDescription) pageData.metaDescription = desired.metaDescription;

  const block = headingBlock(page);
  if (!block) {
    const error = new Error(`Aucun bloc de titre existant sur /${page.slug || "home"}; création structurelle interdite.`);
    error.code = "MSE_25_86_EXISTING_HEADING_REQUIRED";
    throw error;
  }
  const content = blockContent(block);
  const key = headingKey(content);
  const nextContent = { ...content, [key]: desired.h1 };
  snapshots.push({ type: "block", id: block.id, pageId: page.id, content: cloneJson(content) });

  if (!dryRun) {
    if (Object.keys(pageData).length) await tx.agencySitePage.update({ where: { id: page.id }, data: pageData });
    if (content[key] !== desired.h1) await tx.pageBlock.update({ where: { id: block.id }, data: { content: nextContent } });
  }

  changes.push({
    pageId: page.id,
    slug: page.slug,
    pageFields: Object.keys(pageData),
    headingBlockId: block.id,
    headingKey: key,
    headingChanged: content[key] !== desired.h1,
  });
}

async function appendLocalContext(tx, page, city, snapshots, changes, dryRun) {
  const block = descriptiveBlock(page);
  if (!block) {
    const error = new Error(`Aucun texte existant utilisable sur /${page?.slug || "home"}; création de bloc interdite.`);
    error.code = "MSE_25_86_EXISTING_TEXT_REQUIRED";
    throw error;
  }
  const content = blockContent(block);
  const key = descriptiveStringKey(content);
  const sentence = localContextSentence(city);
  if (normalize(content[key]).includes(normalize(sentence))) return;
  const nextContent = { ...content, [key]: `${String(content[key]).trim()} ${sentence}`.trim() };
  snapshots.push({ type: "block", id: block.id, pageId: page.id, content: cloneJson(content) });
  if (!dryRun) await tx.pageBlock.update({ where: { id: block.id }, data: { content: nextContent } });
  changes.push({ pageId: page.id, slug: page.slug, localContextBlockId: block.id, localContextKey: key });
}

async function loadTargetSite(prisma, tenantId, city) {
  const sites = await prisma.agencySite.findMany({
    where: { tenantId },
    include: {
      agency: true,
      pages: {
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  const wanted = normalize(city);
  return sites.find((site) => normalize(site?.agency?.city) === wanted) || null;
}

async function run({ dryRun = !explicitTrue(process.env.MSE_25_86_CONFIRM), tenantSlug = process.env.TENANT_SLUG || "mondescale", reportDir = process.env.MSE_25_86_REPORT_DIR || "/home/admin1/mse-25-86-reports" } = {}) {
  const prisma = new PrismaClient();
  const generatedAt = new Date().toISOString();
  const snapshots = [];
  const changes = [];
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant?.id) {
      const error = new Error(`Tenant ${tenantSlug} introuvable.`);
      error.code = "MSE_25_86_TENANT_NOT_FOUND";
      throw error;
    }

    for (const target of TARGETS) {
      const site = await loadTargetSite(prisma, tenant.id, target.city);
      if (!site) {
        const error = new Error(`Mini-site introuvable pour ${target.city}.`);
        error.code = "MSE_25_86_SITE_NOT_FOUND";
        throw error;
      }
      const home = pageByCandidates(site.pages, target.home);
      const services = pageByCandidates(site.pages, target.services);
      const contact = pageByCandidates(site.pages, target.contact);
      if (!home || !services || !contact) {
        const error = new Error(`Pages SEO attendues manquantes pour ${target.city}.`);
        error.code = "MSE_25_86_TARGET_PAGE_MISSING";
        error.details = { city: target.city, home: Boolean(home), services: Boolean(services), contact: Boolean(contact) };
        throw error;
      }

      await prisma.$transaction(async (tx) => {
        await updatePageSeo(tx, home, homeSeo(target.city), snapshots, changes, dryRun);
        await updatePageSeo(tx, services, servicesSeo(target.city), snapshots, changes, dryRun);
        await updatePageSeo(tx, contact, contactSeo(target.city), snapshots, changes, dryRun);
        if (target.localContext) await appendLocalContext(tx, home, target.city, snapshots, changes, dryRun);
      });
    }

    const report = {
      type: "mse-25.86-seo-coverage-remediation",
      generatedAt,
      dryRun,
      writes: !dryRun,
      frontendFilesTouched: 0,
      structuralBlocksCreated: 0,
      structuralBlocksDeleted: 0,
      targetCities: TARGETS.map((item) => item.city),
      changes,
      rollbackSnapshots: snapshots,
    };
    const targetFile = path.join(reportDir, `mse-25-86-${dryRun ? "preview" : "apply"}-${timestamp()}.json`);
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({ ok: true, dryRun, writes: !dryRun, sites: TARGETS.length, changes: changes.length, frontendFilesTouched: 0, reportPath: targetFile }, null, 2));
    return report;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_86_FAILED", message: error.message, details: error.details || null }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  TARGETS,
  normalize,
  pageByCandidates,
  homeSeo,
  servicesSeo,
  contactSeo,
  localContextSentence,
  headingBlock,
  descriptiveBlock,
  run,
};
