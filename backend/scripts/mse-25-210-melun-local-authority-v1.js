"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.210";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_LEGAL_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske";
const FORBIDDEN_BRAND = "Ambassade FRAM - Mondescale Maurepas";
const APPLY = String(process.env.MSE_25_210_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_210_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_210_SNAPSHOT || "/var/tmp/mse-25-210-melun-local-authority-v1.snapshot.json";

const PAGE_PATCHES = Object.freeze({
  engagements: {
    seoTitle: "Engagements de votre agence de voyages à Melun | Conseil et suivi",
    metaDescription: "Découvrez les engagements de votre agence de voyages à Melun : écoute, information claire, conseil et suivi de votre dossier avant, pendant et après votre voyage.",
    h1: "Nos engagements pour votre voyage à Melun",
  },
  partenaires: {
    seoTitle: "Voyagistes et partenaires | Agence de voyages à Melun",
    metaDescription: "Découvrez les voyagistes et partenaires référencés par votre agence à Melun pour construire séjours, circuits, croisières, billets d’avion et voyages sur mesure.",
    h1: "Nos voyagistes et partenaires à Melun",
  },
  inspirations: {
    seoTitle: "Idées de voyages à Melun | Inspirations et conseils en agence",
    metaDescription: "Trouvez des idées de voyages avec votre agence à Melun : destinations, séjours, circuits, croisières et projets sur mesure à étudier avec un conseiller.",
    h1: "Inspirations et idées de voyages à Melun",
  },
});

const BLOCK_PATCHES = Object.freeze({
  mse25125bnmelunhome: {
    title: "Votre agence de voyages à Melun et dans le bassin melunais",
    html: "<p>À Melun, votre agence vous accompagne pour préparer séjours, circuits, croisières, voyages sur mesure, autotours, vacances en famille et billets d’avion. Chaque projet est étudié selon vos dates, vos envies, votre budget et les solutions réellement disponibles auprès des voyagistes référencés.</p><p>L’agence accueille les voyageurs de Melun et du bassin melunais, notamment Dammarie-les-Lys, Le Mée-sur-Seine, Vaux-le-Pénil, La Rochette, Rubelles et Vert-Saint-Denis. Vous bénéficiez d’un interlocuteur en agence pour comparer les solutions, comprendre les prestations et suivre votre dossier.</p>",
  },
  mse25125bnmelunservices: {
    title: "Billetterie, séjours, circuits, croisières et voyages sur mesure à Melun",
    html: "<p>Votre agence de voyages à Melun vous accompagne pour la billetterie aérienne, les séjours et clubs, les circuits accompagnés, les croisières, les autotours, les voyages de noces, les vacances en famille, les voyages en groupe et les projets sur mesure.</p><p>Le conseil en agence permet de comparer les solutions disponibles, d’identifier les prestations incluses et les conditions applicables, puis d’assurer le suivi de votre réservation. Les propositions sont adaptées à votre demande et aux disponibilités des partenaires référencés.</p>",
  },
});

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.keys(v).sort().reduce((acc, key) => { acc[key] = stable(v[key]); return acc; }, {});
  }
  return v;
}
function hash(v) { return crypto.createHash("sha256").update(JSON.stringify(stable(v))).digest("hex"); }
function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

async function loadState() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable: ${TENANT_SLUG}`);
  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: { orderBy: { displayOrder: "asc" }, include: { blocks: { orderBy: { displayOrder: "asc" } } } },
    },
  });
  const legalProfile = await prisma.legalProfile.findUnique({
    where: { tenantId_agencyId: { tenantId: tenant.id, agencyId: EXPECTED_AGENCY_ID } },
  });
  return { tenant, site, legalProfile };
}

function topologyFingerprint(site) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status },
    pages: (site.pages || []).map((p) => ({
      id: p.id, slug: p.slug, path: p.path, pageType: p.pageType, status: p.status,
      published: p.published, schemaType: p.schemaType,
      blocks: (p.blocks || []).map((b) => ({
        id: b.id, name: b.name, blockType: b.blockType, status: b.status,
        visibleDesktop: b.visibleDesktop, visibleMobile: b.visibleMobile, displayOrder: b.displayOrder,
      })),
    })),
  });
}

function protectedFingerprint(state) {
  const targetPages = new Set(Object.keys(PAGE_PATCHES));
  const targetBlocks = new Set(Object.keys(BLOCK_PATCHES));
  const site = state.site;
  return hash({
    tenant: { id: state.tenant.id, slug: state.tenant.slug },
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme, agencyId: site.agencyId },
    agency: site.agency,
    legalProfile: state.legalProfile,
    pages: (site.pages || []).map((p) => ({
      id: p.id, slug: p.slug, path: p.path, pageType: p.pageType,
      title: p.title, menuTitle: p.menuTitle, menuLocation: p.menuLocation,
      displayOrder: p.displayOrder, schemaType: p.schemaType, status: p.status, published: p.published,
      seoTitle: targetPages.has(String(p.slug || "")) ? "__TARGET__" : p.seoTitle,
      metaDescription: targetPages.has(String(p.slug || "")) ? "__TARGET__" : p.metaDescription,
      h1: targetPages.has(String(p.slug || "")) ? "__TARGET__" : p.h1,
      blocks: (p.blocks || []).map((b) => ({
        id: b.id, blockType: b.blockType, name: b.name,
        content: targetBlocks.has(b.id) ? { ...clone(b.content || {}), title: "__TARGET__", html: "__TARGET__" } : b.content,
        settings: b.settings, seo: b.seo, displayOrder: b.displayOrder,
        status: b.status, visibleDesktop: b.visibleDesktop, visibleMobile: b.visibleMobile,
        version: targetBlocks.has(b.id) ? "__TARGET__" : b.version,
      })),
    })),
  });
}

function assertPreconditions(state) {
  const { tenant, site, legalProfile } = state;
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenantId inattendu: ${tenant.id}`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: mauvais siteSlug`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);
  if (!legalProfile || legalProfile.id !== EXPECTED_LEGAL_PROFILE_ID) throw new Error(`${CONTRACT}: profil juridique Melun inattendu`);
  if (String(legalProfile.legalNoticeContent || "").includes(FORBIDDEN_BRAND)) throw new Error(`${CONTRACT}: résidu Maurepas/FRAM encore présent dans le profil juridique`);

  for (const slug of Object.keys(PAGE_PATCHES)) {
    const page = (site.pages || []).find((p) => String(p.slug || "") === slug);
    if (!page || page.status !== "published" || page.published !== true) throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
  }
  for (const id of Object.keys(BLOCK_PATCHES)) {
    const block = (site.pages || []).flatMap((p) => p.blocks || []).find((b) => b.id === id);
    if (!block) throw new Error(`${CONTRACT}: bloc cible introuvable: ${id}`);
    if (block.blockType !== "rich_text") throw new Error(`${CONTRACT}: type inattendu pour ${id}: ${block.blockType}`);
  }
}

function buildPlan(state) {
  const site = state.site;
  const pages = Object.entries(PAGE_PATCHES).map(([slug, after]) => {
    const page = site.pages.find((p) => String(p.slug || "") === slug);
    return { id: page.id, slug, before: { seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1 }, after };
  });
  const blocks = Object.entries(BLOCK_PATCHES).map(([id, after]) => {
    const block = site.pages.flatMap((p) => p.blocks || []).find((b) => b.id === id);
    return { id, before: { title: block.content?.title || null, html: block.content?.html || null, version: block.version }, after };
  });
  return { pages, blocks };
}

async function restore(snapshot) {
  await prisma.$transaction(async (tx) => {
    for (const p of snapshot.pages || []) await tx.agencySitePage.update({ where: { id: p.id }, data: { seoTitle: p.seoTitle, metaDescription: p.metaDescription, h1: p.h1 } });
    for (const b of snapshot.blocks || []) await tx.pageBlock.update({ where: { id: b.id }, data: { content: b.content, version: b.version } });
  });
}

async function main() {
  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.agencyId !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: snapshot non conforme à la cible Melun`);
    await restore(snapshot);
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", target: TARGET_SITE_SLUG, restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadState();
  assertPreconditions(before);
  const beforeTopology = topologyFingerprint(before.site);
  const beforeProtected = protectedFingerprint(before);
  const plan = buildPlan(before);

  if (!APPLY) {
    console.log(JSON.stringify({ contract: CONTRACT, mode: "DRY_RUN", target: TARGET_SITE_SLUG, agencyId: before.site.agencyId, topologyFingerprint: beforeTopology, protectedFingerprint: beforeProtected, legalProfileId: before.legalProfile.id, pageWrites: plan.pages.length, blockWrites: plan.blocks.length, plan, mutationPerformed: false }, null, 2));
    return;
  }

  const snapshot = {
    contract: CONTRACT, createdAt: new Date().toISOString(), target: TARGET_SITE_SLUG, agencyId: EXPECTED_AGENCY_ID,
    topologyFingerprint: beforeTopology, protectedFingerprint: beforeProtected,
    pages: plan.pages.map((p) => ({ id: p.id, ...p.before })),
    blocks: plan.blocks.map((entry) => {
      const b = before.site.pages.flatMap((p) => p.blocks || []).find((x) => x.id === entry.id);
      return { id: b.id, content: clone(b.content), version: b.version };
    }),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  await prisma.$transaction(async (tx) => {
    for (const p of plan.pages) await tx.agencySitePage.update({ where: { id: p.id }, data: p.after });
    for (const [id, patch] of Object.entries(BLOCK_PATCHES)) {
      const b = before.site.pages.flatMap((p) => p.blocks || []).find((x) => x.id === id);
      await tx.pageBlock.update({ where: { id }, data: { content: { ...clone(b.content || {}), ...patch }, version: Number(b.version || 0) + 1 } });
    }
  });

  const after = await loadState();
  try {
    assertPreconditions(after);
    if (topologyFingerprint(after.site) !== beforeTopology) throw new Error(`${CONTRACT}: topologie modifiée`);
    if (protectedFingerprint(after) !== beforeProtected) throw new Error(`${CONTRACT}: champ protégé modifié`);
    for (const [slug, expected] of Object.entries(PAGE_PATCHES)) {
      const p = after.site.pages.find((x) => String(x.slug || "") === slug);
      for (const [key, value] of Object.entries(expected)) if (p[key] !== value) throw new Error(`${CONTRACT}: valeur page inattendue après APPLY: ${slug}.${key}`);
    }
    for (const [id, expected] of Object.entries(BLOCK_PATCHES)) {
      const b = after.site.pages.flatMap((p) => p.blocks || []).find((x) => x.id === id);
      if (b.content?.title !== expected.title || b.content?.html !== expected.html) throw new Error(`${CONTRACT}: valeur bloc inattendue après APPLY: ${id}`);
    }
  } catch (error) {
    await restore(snapshot);
    throw new Error(`${error.message}; rollback automatique effectué`);
  }

  console.log(JSON.stringify({ contract: CONTRACT, mode: "APPLY", target: TARGET_SITE_SLUG, agencyId: after.site.agencyId, topologyFingerprint: topologyFingerprint(after.site), protectedFingerprint: protectedFingerprint(after), legalProfileId: after.legalProfile.id, pageWrites: plan.pages.length, blockWrites: plan.blocks.length, mutationPerformed: true, snapshot: SNAPSHOT_PATH }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
