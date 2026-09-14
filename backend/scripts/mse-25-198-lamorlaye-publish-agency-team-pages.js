"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = process.env.MSE_25_198_SITE_SLUG || "mondescale-lamorlaye";
const APPLY = String(process.env.MSE_25_198_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_198_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_198_SNAPSHOT || "/var/tmp/mse-25-198-lamorlaye-agency-team-pages.snapshot.json";
const TARGETS = Object.freeze([
  Object.freeze({ kind: "agency", aliases: ["agence", "notre-agence", "qui-sommes-nous"] }),
  Object.freeze({ kind: "team", aliases: ["equipe", "équipe", "team", "notre-equipe"] }),
]);

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stable(value[key]); return acc; }, {});
  return value;
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }

async function loadSites(tenantId) {
  return prisma.agencySite.findMany({
    where: { tenantId },
    include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } },
  });
}

function findTargetPage(site, target) {
  const aliases = new Set(target.aliases.map(normalize));
  return (site.pages || []).find((page) => aliases.has(normalize(page.slug))) || null;
}

function pageState(page) {
  if (!page) return null;
  const state = { id: page.id, slug: page.slug, title: page.title, path: page.path ?? null };
  for (const key of ["status", "published", "publishedAt", "isPublished"]) {
    if (Object.prototype.hasOwnProperty.call(page, key)) state[key] = page[key];
  }
  return state;
}

function pagePublicationPatch(page) {
  const data = {};
  if (Object.prototype.hasOwnProperty.call(page, "status")) data.status = "published";
  if (Object.prototype.hasOwnProperty.call(page, "published")) data.published = true;
  if (Object.prototype.hasOwnProperty.call(page, "isPublished")) data.isPublished = true;
  if (Object.prototype.hasOwnProperty.call(page, "publishedAt") && !page.publishedAt) data.publishedAt = new Date();
  if (!Object.keys(data).length) throw new Error(`MSE-25.198: aucun champ de publication supporté sur ${page.slug}`);
  return data;
}

function topologyFingerprint(site) {
  return hash((site.pages || []).map((page) => ({
    id: page.id,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    menuTitle: page.menuTitle,
    menuLocation: page.menuLocation,
    displayOrder: page.displayOrder,
    schemaType: page.schemaType,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function contentFingerprint(site, excludedPageIds = new Set()) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, theme: site.theme },
    pages: (site.pages || []).filter((page) => !excludedPageIds.has(page.id)).map((page) => ({
      id: page.id, slug: page.slug, title: page.title, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1,
      status: page.status, published: page.published, publishedAt: page.publishedAt, isPublished: page.isPublished,
      blocks: page.blocks,
    })),
  });
}

async function rollback(site) {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.198: snapshot absent: ${SNAPSHOT_PATH}`);
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot.siteId !== site.id || snapshot.siteSlug !== site.slug) throw new Error("MSE-25.198: snapshot incompatible");
  await prisma.$transaction(async (tx) => {
    for (const page of snapshot.pages || []) {
      const data = {};
      for (const key of ["status", "published", "publishedAt", "isPublished"]) {
        if (Object.prototype.hasOwnProperty.call(page, key)) data[key] = page[key];
      }
      await tx.agencySitePage.update({ where: { id: page.id }, data });
    }
  });
  const archived = `${SNAPSHOT_PATH}.rolledback-${Date.now()}`;
  fs.renameSync(SNAPSHOT_PATH, archived);
  return { restoredPages: snapshot.pages.length, archivedSnapshot: archived };
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error("MSE-25.198: APPLY et ROLLBACK incompatibles");
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`MSE-25.198: tenant introuvable: ${TENANT_SLUG}`);
  const sites = await loadSites(tenant.id);
  const site = sites.find((candidate) => candidate.slug === TARGET_SITE_SLUG);
  if (!site) throw new Error(`MSE-25.198: site introuvable: ${TARGET_SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`MSE-25.198: ville cible inattendue: ${site.agency?.city || "absente"}`);

  const targets = TARGETS.map((target) => ({ ...target, page: findTargetPage(site, target) }));
  if (targets.some((target) => !target.page)) throw new Error(`MSE-25.198: page existante introuvable: ${targets.filter((target) => !target.page).map((target) => target.kind).join(", ")}`);
  const targetIds = new Set(targets.map((target) => target.page.id));
  const before = {
    topology: topologyFingerprint(site),
    untouchedContent: contentFingerprint(site, targetIds),
    pages: targets.map((target) => ({ kind: target.kind, ...pageState(target.page), patch: pagePublicationPatch(target.page) })),
  };

  if (ROLLBACK) {
    const result = await rollback(site);
    console.log(JSON.stringify({ mse: "25.198", mode: "ROLLBACK", site: site.slug, ...result }, null, 2));
    return;
  }

  if (!APPLY) {
    console.log(JSON.stringify({ mse: "25.198", mode: "DRY_RUN", site: site.slug, before, networkWrites: 0, routeCreation: 0 }, null, 2));
    return;
  }

  if (fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.198: snapshot déjà présent: ${SNAPSHOT_PATH}`);
  const snapshot = { mse: "25.198", siteId: site.id, siteSlug: site.slug, createdAt: new Date().toISOString(), pages: targets.map((target) => pageState(target.page)) };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { flag: "wx", mode: 0o600 });

  try {
    await prisma.$transaction(async (tx) => {
      for (const target of targets) {
        await tx.agencySitePage.update({ where: { id: target.page.id }, data: pagePublicationPatch(target.page) });
      }
    });

    const freshSites = await loadSites(tenant.id);
    const fresh = freshSites.find((candidate) => candidate.id === site.id);
    const after = {
      topology: topologyFingerprint(fresh),
      untouchedContent: contentFingerprint(fresh, targetIds),
      pages: targets.map((target) => ({ kind: target.kind, ...pageState(findTargetPage(fresh, target)) })),
    };
    if (before.topology !== after.topology) throw new Error("MSE-25.198: topologie Lamorlaye modifiée");
    if (before.untouchedContent !== after.untouchedContent) throw new Error("MSE-25.198: contenu hors pages Agence/Équipe modifié");

    console.log(JSON.stringify({
      mse: "25.198", mode: "APPLY", site: site.slug, snapshot: SNAPSHOT_PATH,
      pages: after.pages,
      topologyUnchanged: true,
      untouchedContentUnchanged: true,
      networkWrites: 0,
      routeCreation: 0,
    }, null, 2));
  } catch (error) {
    try { await rollback(site); } catch (rollbackError) { error.rollbackError = rollbackError.message; }
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
