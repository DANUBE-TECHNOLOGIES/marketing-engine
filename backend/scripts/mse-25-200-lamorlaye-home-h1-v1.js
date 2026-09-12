"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = process.env.MSE_25_200_SITE_SLUG || "mondescale-lamorlaye";
const TARGET_H1 = "Agence de voyages à Lamorlaye";
const APPLY = String(process.env.MSE_25_200_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_200_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_200_SNAPSHOT || "/var/tmp/mse-25-200-lamorlaye-home-h1-v1.snapshot.json";

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stable(value[key]); return acc; }, {});
  return value;
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function contentOf(block) { return block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {}; }
function isHero(block) { return normalize(block?.blockType || block?.type) === "hero"; }

async function loadSite(tenantId) {
  return prisma.agencySite.findFirst({
    where: { tenantId, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: {
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

function homePage(site) {
  return (site.pages || []).find((candidate) => ["home", "accueil", "index", ""].includes(normalize(candidate.slug))) || null;
}

function routeFingerprint(site) {
  return hash((site.pages || []).map((page) => ({
    id: page.id,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    menuTitle: page.menuTitle,
    menuLocation: page.menuLocation,
    displayOrder: page.displayOrder,
    schemaType: page.schemaType,
    status: page.status,
    published: page.published,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function protectedFingerprint(site, heroId) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme },
    agency: site.agency,
    pages: (site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      seoTitle: page.seoTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      status: page.status,
      published: page.published,
      blocks: (page.blocks || []).filter((block) => block.id !== heroId).map((block) => ({
        id: block.id,
        blockType: block.blockType,
        name: block.name,
        content: block.content,
        settings: block.settings,
        seo: block.seo,
        displayOrder: block.displayOrder,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: block.version,
      })),
    })),
  });
}

function heroState(hero) {
  const content = contentOf(hero);
  return {
    id: hero.id,
    pageId: hero.pageId,
    blockType: hero.blockType,
    status: hero.status,
    visibleDesktop: hero.visibleDesktop,
    visibleMobile: hero.visibleMobile,
    version: hero.version,
    title: content.title || null,
    heading: content.heading || null,
    subtitle: content.subtitle || null,
    eyebrow: content.eyebrow || null,
    imageAssetId: content.imageAssetId || null,
    imageUrl: content.imageUrl || null,
  };
}

async function rollback(site) {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.200: snapshot absent: ${SNAPSHOT_PATH}`);
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot.siteId !== site.id || snapshot.siteSlug !== site.slug) throw new Error("MSE-25.200: snapshot incompatible");
  await prisma.pageBlock.update({
    where: { id: snapshot.hero.id },
    data: { content: snapshot.hero.content, version: snapshot.hero.version },
  });
  const archived = `${SNAPSHOT_PATH}.rolledback-${Date.now()}`;
  fs.renameSync(SNAPSHOT_PATH, archived);
  return { restoredHero: snapshot.hero.id, archivedSnapshot: archived };
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error("MSE-25.200: APPLY et ROLLBACK incompatibles");
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`MSE-25.200: tenant introuvable: ${TENANT_SLUG}`);
  const site = await loadSite(tenant.id);
  if (!site) throw new Error(`MSE-25.200: site introuvable: ${TARGET_SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`MSE-25.200: ville inattendue: ${site.agency?.city || "absente"}`);
  const home = homePage(site);
  if (!home) throw new Error("MSE-25.200: home introuvable");
  const heroes = (home.blocks || []).filter((block) => isHero(block) && block.visibleDesktop !== false && block.visibleMobile !== false);
  if (heroes.length !== 1) throw new Error(`MSE-25.200: nombre de heroes visibles inattendu: ${heroes.length}`);
  const hero = heroes[0];
  const content = contentOf(hero);
  const before = {
    routeFingerprint: routeFingerprint(site),
    protectedFingerprint: protectedFingerprint(site, hero.id),
    seoTitle: home.seoTitle,
    metaDescription: home.metaDescription,
    pageH1: home.h1 || null,
    hero: heroState(hero),
    targetH1: TARGET_H1,
  };

  if (ROLLBACK) {
    const result = await rollback(site);
    console.log(JSON.stringify({ mse: "25.200", mode: "ROLLBACK", site: site.slug, ...result }, null, 2));
    return;
  }

  if (!APPLY) {
    console.log(JSON.stringify({
      mse: "25.200",
      mode: "DRY_RUN",
      site: site.slug,
      before,
      planned: { heroId: hero.id, from: content.title || null, to: TARGET_H1 },
      pageWrites: 0,
      routeWrites: 0,
      networkWrites: 0,
    }, null, 2));
    return;
  }

  if (content.title === TARGET_H1) throw new Error("MSE-25.200: H1 déjà conforme; refus d'une écriture vide");
  if (fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.200: snapshot déjà présent: ${SNAPSHOT_PATH}`);

  const snapshot = {
    mse: "25.200",
    siteId: site.id,
    siteSlug: site.slug,
    createdAt: new Date().toISOString(),
    hero: { id: hero.id, content: content, version: hero.version },
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { flag: "wx", mode: 0o600 });

  try {
    await prisma.pageBlock.update({
      where: { id: hero.id },
      data: {
        content: { ...content, title: TARGET_H1 },
        version: hero.version + 1,
      },
    });

    const fresh = await loadSite(tenant.id);
    const freshHome = homePage(fresh);
    const freshHero = (freshHome.blocks || []).find((block) => block.id === hero.id);
    if (!freshHero) throw new Error("MSE-25.200: hero introuvable après écriture");
    if (contentOf(freshHero).title !== TARGET_H1) throw new Error("MSE-25.200: H1 hero non conforme après écriture");
    if (routeFingerprint(fresh) !== before.routeFingerprint) throw new Error("MSE-25.200: topologie modifiée hors périmètre");
    if (protectedFingerprint(fresh, hero.id) !== before.protectedFingerprint) throw new Error("MSE-25.200: contenu non ciblé modifié");
    if (freshHome.seoTitle !== before.seoTitle || freshHome.metaDescription !== before.metaDescription || (freshHome.h1 || null) !== before.pageH1) {
      throw new Error("MSE-25.200: métadonnées de page modifiées hors périmètre");
    }

    const beforeContent = stable(content);
    const afterContent = stable(contentOf(freshHero));
    const expectedContent = stable({ ...content, title: TARGET_H1 });
    if (JSON.stringify(afterContent) !== JSON.stringify(expectedContent)) throw new Error("MSE-25.200: autre champ du hero modifié");

    console.log(JSON.stringify({
      mse: "25.200",
      mode: "APPLY",
      site: site.slug,
      snapshot: SNAPSHOT_PATH,
      heroBefore: { ...heroState(hero), contentFingerprint: hash(beforeContent) },
      heroAfter: { ...heroState(freshHero), contentFingerprint: hash(afterContent) },
      seoTitleUnchanged: true,
      metaDescriptionUnchanged: true,
      pageH1Unchanged: true,
      routeFingerprintUnchanged: true,
      protectedContentUnchanged: true,
      pageWrites: 0,
      routeWrites: 0,
      networkWrites: 0,
    }, null, 2));
  } catch (error) {
    try { await rollback(site); } catch (rollbackError) { error.rollbackError = rollbackError.message; }
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
