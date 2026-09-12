"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = process.env.MSE_25_199_SITE_SLUG || "mondescale-lamorlaye";
const APPLY = String(process.env.MSE_25_199_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_199_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_199_SNAPSHOT || "/var/tmp/mse-25-199-lamorlaye-editorial-deduplication.snapshot.json";

const TARGET_TITLES = Object.freeze({
  home: Object.freeze([
    "Pourquoi choisir notre agence ?",
    "Nos services",
  ]),
  services: Object.freeze([
    "Nos services",
    "Billetterie et vols à Lamorlaye",
    "Un accompagnement organisé depuis Lamorlaye",
    "Billetterie aérienne et vols à Lamorlaye",
    "Séjours et vacances avec votre agence à Lamorlaye",
  ]),
});

const KEEP_TITLES = new Set([
  "Quel voyage préparez-vous ?",
  "Billets d'avion et de train à Lamorlaye",
  "Parlons de votre prochain voyage",
  "Questions fréquentes sur nos services",
]);

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stable(value[key]); return acc; }, {});
  return value;
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function contentOf(block) { return block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {}; }
function titleOf(block) { return String(contentOf(block).title || block?.title || "").trim(); }

async function loadSites(tenantId) {
  return prisma.agencySite.findMany({
    where: { tenantId },
    include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } },
  });
}

function page(site, slug) {
  return (site.pages || []).find((candidate) => normalize(candidate.slug) === normalize(slug)) || null;
}

function blockState(block) {
  return {
    id: block.id,
    pageId: block.pageId,
    name: block.name,
    blockType: block.blockType,
    title: titleOf(block),
    status: block.status,
    visibleDesktop: block.visibleDesktop,
    visibleMobile: block.visibleMobile,
    version: block.version,
  };
}

function targetBlocks(pageObj, titles) {
  const wanted = new Set(titles.map(normalize));
  return (pageObj?.blocks || []).filter((block) => {
    const title = titleOf(block);
    if (!title || KEEP_TITLES.has(title)) return false;
    return wanted.has(normalize(title));
  });
}

function routeFingerprint(site) {
  return hash((site.pages || []).map((pageObj) => ({
    id: pageObj.id, slug: pageObj.slug, path: pageObj.path, pageType: pageObj.pageType,
    menuTitle: pageObj.menuTitle, menuLocation: pageObj.menuLocation, displayOrder: pageObj.displayOrder,
    schemaType: pageObj.schemaType, status: pageObj.status, published: pageObj.published,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function protectedFingerprint(site, excludedBlockIds) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme },
    agency: site.agency,
    pages: (site.pages || []).map((pageObj) => ({
      id: pageObj.id, slug: pageObj.slug, title: pageObj.title, seoTitle: pageObj.seoTitle, metaDescription: pageObj.metaDescription, h1: pageObj.h1,
      status: pageObj.status, published: pageObj.published,
      blocks: (pageObj.blocks || []).filter((block) => !excludedBlockIds.has(block.id)).map((block) => ({
        id: block.id, blockType: block.blockType, name: block.name, content: block.content, settings: block.settings, seo: block.seo,
        displayOrder: block.displayOrder, status: block.status, visibleDesktop: block.visibleDesktop, visibleMobile: block.visibleMobile, version: block.version,
      })),
    })),
  });
}

async function rollback(site) {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.199: snapshot absent: ${SNAPSHOT_PATH}`);
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot.siteId !== site.id || snapshot.siteSlug !== site.slug) throw new Error("MSE-25.199: snapshot incompatible");
  await prisma.$transaction(async (tx) => {
    for (const block of snapshot.blocks || []) {
      await tx.pageBlock.update({ where: { id: block.id }, data: {
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: block.version,
      } });
    }
  });
  const archived = `${SNAPSHOT_PATH}.rolledback-${Date.now()}`;
  fs.renameSync(SNAPSHOT_PATH, archived);
  return { restoredBlocks: snapshot.blocks.length, archivedSnapshot: archived };
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error("MSE-25.199: APPLY et ROLLBACK incompatibles");
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`MSE-25.199: tenant introuvable: ${TENANT_SLUG}`);
  const sites = await loadSites(tenant.id);
  const site = sites.find((candidate) => candidate.slug === TARGET_SITE_SLUG);
  if (!site) throw new Error(`MSE-25.199: site introuvable: ${TARGET_SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`MSE-25.199: ville inattendue: ${site.agency?.city || "absente"}`);

  const home = page(site, "home") || page(site, "accueil") || (site.pages || []).find((candidate) => !normalize(candidate.slug));
  const services = page(site, "services");
  if (!home || !services) throw new Error("MSE-25.199: home/services introuvable");

  const homeTargets = targetBlocks(home, TARGET_TITLES.home);
  const serviceTargets = targetBlocks(services, TARGET_TITLES.services);
  const targets = [...homeTargets, ...serviceTargets];
  const excluded = new Set(targets.map((block) => block.id));
  const before = {
    routeFingerprint: routeFingerprint(site),
    protectedFingerprint: protectedFingerprint(site, excluded),
    homeTargets: homeTargets.map(blockState),
    serviceTargets: serviceTargets.map(blockState),
  };

  if (ROLLBACK) {
    const result = await rollback(site);
    console.log(JSON.stringify({ mse: "25.199", mode: "ROLLBACK", site: site.slug, ...result }, null, 2));
    return;
  }

  if (!APPLY) {
    console.log(JSON.stringify({ mse: "25.199", mode: "DRY_RUN", site: site.slug, before, plannedDisableCount: targets.length, routeWrites: 0, networkWrites: 0 }, null, 2));
    return;
  }

  if (!targets.length) throw new Error("MSE-25.199: aucun bloc legacy exact à désactiver; refus d'une écriture vide ou approximative");
  if (fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.199: snapshot déjà présent: ${SNAPSHOT_PATH}`);

  const snapshot = { mse: "25.199", siteId: site.id, siteSlug: site.slug, createdAt: new Date().toISOString(), blocks: targets.map((block) => clone(blockState(block))) };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { flag: "wx", mode: 0o600 });

  try {
    await prisma.$transaction(async (tx) => {
      for (const block of targets) {
        await tx.pageBlock.update({ where: { id: block.id }, data: { status: "draft", visibleDesktop: false, visibleMobile: false, version: block.version + 1 } });
      }
    });

    const freshSites = await loadSites(tenant.id);
    const fresh = freshSites.find((candidate) => candidate.id === site.id);
    const afterRoute = routeFingerprint(fresh);
    const afterProtected = protectedFingerprint(fresh, excluded);
    if (before.routeFingerprint !== afterRoute) throw new Error("MSE-25.199: topologie/page publication modifiée hors périmètre");
    if (before.protectedFingerprint !== afterProtected) throw new Error("MSE-25.199: contenu non ciblé modifié");

    const disabled = targets.map((block) => {
      const freshPage = (fresh.pages || []).find((candidate) => candidate.id === block.pageId);
      const freshBlock = (freshPage?.blocks || []).find((candidate) => candidate.id === block.id);
      return blockState(freshBlock);
    });
    if (disabled.some((block) => block.status !== "draft" || block.visibleDesktop !== false || block.visibleMobile !== false)) {
      throw new Error("MSE-25.199: désactivation incomplète");
    }

    console.log(JSON.stringify({
      mse: "25.199", mode: "APPLY", site: site.slug, snapshot: SNAPSHOT_PATH,
      disabled,
      routeFingerprintUnchanged: true,
      protectedContentUnchanged: true,
      routeWrites: 0,
      networkWrites: 0,
    }, null, 2));
  } catch (error) {
    try { await rollback(site); } catch (rollbackError) { error.rollbackError = rollbackError.message; }
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
