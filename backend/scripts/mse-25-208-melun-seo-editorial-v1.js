"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.208";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_CITY = "Melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_TOPOLOGY = "06072a84a232869e738107683549a3c5978418ebadcbc4aa8b7529c0dec9e100";
const FUTURE_SLUG = "ambassade-fram-mondescale-melun";
const APPLY = String(process.env.MSE_25_208_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_208_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_208_SNAPSHOT || "/var/tmp/mse-25-208-melun-seo-editorial-v1.snapshot.json";

const PAGE_PATCHES = Object.freeze({
  "": {
    seoTitle: "Agence de voyages à Melun | Séjours, circuits, croisières et sur mesure",
    metaDescription: "Votre agence de voyages à Melun vous accompagne pour séjours, circuits, croisières, voyages sur mesure et billetterie, avec conseil et suivi en agence.",
    h1: "Agence de voyages à Melun",
  },
  agence: {
    seoTitle: "Votre agence de voyages à Melun | Conseil et accompagnement",
    metaDescription: "Découvrez votre agence de voyages à Melun : écoute, conseils personnalisés et accompagnement pour préparer séjours, circuits, croisières et voyages sur mesure.",
    h1: "Votre agence de voyages à Melun",
  },
  equipe: {
    seoTitle: "Conseillers voyages à Melun | Votre équipe en agence",
    metaDescription: "Rencontrez l'équipe de votre agence de voyages à Melun et échangez avec un conseiller pour préparer votre séjour, circuit, croisière ou voyage sur mesure.",
    h1: "Votre équipe de conseillers voyages à Melun",
  },
  services: {
    seoTitle: "Billetterie et services voyage à Melun | Agence de voyages",
    metaDescription: "Billetterie, séjours, circuits, croisières et voyages sur mesure à Melun : découvrez les services proposés par votre agence et préparez votre projet avec un conseiller.",
    h1: "Services de votre agence de voyages à Melun",
  },
  destinations: {
    seoTitle: "Destinations et idées de voyages à Melun | Conseils en agence",
    metaDescription: "Explorez des destinations et idées de voyages avec votre agence à Melun, selon vos envies, votre budget et les solutions disponibles auprès des partenaires référencés.",
    h1: "Nos destinations et idées de voyages à Melun",
  },
  avis: {
    seoTitle: "Avis clients | Agence de voyages à Melun",
    metaDescription: "Consultez les avis des voyageurs accompagnés par votre agence de voyages à Melun et découvrez leur expérience avant de préparer votre propre projet.",
    h1: "Avis sur votre agence de voyages à Melun",
  },
  contact: {
    seoTitle: "Contact et rendez-vous | Agence de voyages à Melun",
    metaDescription: "Contactez votre agence de voyages à Melun pour échanger avec un conseiller, demander un devis ou préparer un rendez-vous pour votre prochain voyage.",
    h1: "Contactez votre agence de voyages à Melun",
  },
});

const BLOCK_PATCHES = Object.freeze({
  mse25125bnmelunhome: {
    title: "Une agence de voyages à Melun pour construire votre projet",
    html: "<p>À Melun, votre agence vous accompagne dans la préparation de vos vacances et déplacements. Séjours, circuits, croisières, voyages sur mesure, autotours, voyages en famille ou billetterie : votre projet est étudié selon vos dates, vos envies, votre budget et les solutions disponibles.</p><p>L’agence accueille les voyageurs de Melun et des communes voisines, notamment Dammarie-les-Lys, Le Mée-sur-Seine et Vaux-le-Pénil, sans remplacer le conseil personnalisé par une simple recherche en ligne.</p>",
  },
  mse25125bnmelunservices: {
    title: "Billetterie, séjours, circuits, croisières et voyages sur mesure",
    html: "<p>Votre agence à Melun peut vous accompagner pour la réservation de billets d’avion, de séjours et clubs, de circuits accompagnés, de croisières, d’autotours, de voyages de noces, de vacances en famille, de voyages en groupe et de projets sur mesure.</p><p>Pour chaque demande, le rôle de l’agence est de vous aider à comparer les solutions disponibles, à comprendre les prestations et conditions applicables et à assurer le suivi de votre dossier.</p>",
  },
});

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((a, k) => { a[k] = stable(v[k]); return a; }, {});
  return v;
}
function hash(v) { return crypto.createHash("sha256").update(JSON.stringify(stable(v))).digest("hex"); }

function routeFingerprint(site) {
  return hash((site.pages || []).map((p) => ({
    id: p.id, slug: p.slug, path: p.path, pageType: p.pageType,
    menuTitle: p.menuTitle, menuLocation: p.menuLocation,
    displayOrder: p.displayOrder, schemaType: p.schemaType,
    status: p.status, published: p.published,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function protectedFingerprint(site) {
  const targetBlockIds = new Set(Object.keys(BLOCK_PATCHES));
  const targetSlugs = new Set(Object.keys(PAGE_PATCHES));
  return hash({
    site: {
      id: site.id, slug: site.slug, basePath: site.basePath,
      status: site.status, theme: site.theme,
    },
    agency: site.agency,
    pages: (site.pages || []).map((p) => ({
      id: p.id, slug: p.slug, path: p.path, pageType: p.pageType,
      title: p.title, menuTitle: p.menuTitle, menuLocation: p.menuLocation,
      displayOrder: p.displayOrder, schemaType: p.schemaType,
      status: p.status, published: p.published,
      seoTitle: targetSlugs.has(String(p.slug || "")) ? "__TARGET__" : p.seoTitle,
      metaDescription: targetSlugs.has(String(p.slug || "")) ? "__TARGET__" : p.metaDescription,
      h1: targetSlugs.has(String(p.slug || "")) ? "__TARGET__" : p.h1,
      blocks: (p.blocks || []).map((b) => ({
        id: b.id, blockType: b.blockType, name: b.name,
        content: targetBlockIds.has(b.id) ? {
          ...clone(b.content || {}), title: "__TARGET__", html: "__TARGET__",
        } : b.content,
        settings: b.settings, seo: b.seo, displayOrder: b.displayOrder,
        status: b.status, visibleDesktop: b.visibleDesktop,
        visibleMobile: b.visibleMobile, version: b.version,
      })),
    })),
  });
}

async function loadSite() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable: ${TENANT_SLUG}`);
  return prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: {
        orderBy: { displayOrder: "asc" },
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
}

function assertPreconditions(site) {
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: mauvais siteSlug`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);
  if (routeFingerprint(site) !== EXPECTED_TOPOLOGY) throw new Error(`${CONTRACT}: topologie Melun différente de l'audit MSE-25.207`);
  if (String(site.slug).includes(FUTURE_SLUG)) throw new Error(`${CONTRACT}: futur slug activé prématurément`);

  for (const slug of Object.keys(PAGE_PATCHES)) {
    const page = (site.pages || []).find((p) => String(p.slug || "") === slug);
    if (!page || page.status !== "published" || page.published !== true) {
      throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug || "HOME"}`);
    }
  }

  for (const id of Object.keys(BLOCK_PATCHES)) {
    const found = (site.pages || []).flatMap((p) => p.blocks || []).find((b) => b.id === id);
    if (!found) throw new Error(`${CONTRACT}: bloc cible introuvable: ${id}`);
  }
}

function futureBrandHits(site) {
  const text = JSON.stringify(site).toLowerCase();
  const hits = [];
  if (text.includes("ambassade fram")) hits.push("ambassade fram");
  if (text.includes(FUTURE_SLUG)) hits.push(FUTURE_SLUG);
  return hits;
}

function buildPlan(site) {
  const pages = [];
  for (const [slug, patch] of Object.entries(PAGE_PATCHES)) {
    const page = site.pages.find((p) => String(p.slug || "") === slug);
    pages.push({ id: page.id, slug, before: { seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1 }, after: patch });
  }
  const blocks = [];
  for (const [id, patch] of Object.entries(BLOCK_PATCHES)) {
    const block = site.pages.flatMap((p) => p.blocks || []).find((b) => b.id === id);
    blocks.push({ id, before: { title: block?.content?.title, html: block?.content?.html }, after: patch });
  }
  return { pages, blocks };
}

async function restoreSnapshot(snapshot) {
  await prisma.$transaction(async (tx) => {
    for (const p of snapshot.pages || []) {
      await tx.agencySitePage.update({ where: { id: p.id }, data: { seoTitle: p.seoTitle, metaDescription: p.metaDescription, h1: p.h1 } });
    }
    for (const b of snapshot.blocks || []) {
      await tx.pageBlock.update({ where: { id: b.id }, data: { content: b.content, version: b.version } });
    }
  });
}

async function main() {
  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    await restoreSnapshot(snapshot);
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadSite();
  assertPreconditions(before);
  const beforeProtected = protectedFingerprint(before);
  const plan = buildPlan(before);

  if (!APPLY) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.agencyId,
      topologyFingerprint: routeFingerprint(before),
      protectedFingerprint: beforeProtected,
      futureBrandHits: futureBrandHits(before),
      plan,
      mutationPerformed: false,
    }, null, 2));
    return;
  }

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    topologyFingerprint: routeFingerprint(before),
    protectedFingerprint: beforeProtected,
    pages: plan.pages.map((entry) => ({ id: entry.id, ...entry.before })),
    blocks: Object.keys(BLOCK_PATCHES).map((id) => {
      const block = before.pages.flatMap((p) => p.blocks || []).find((b) => b.id === id);
      return { id: block.id, content: clone(block.content), version: block.version };
    }),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  await prisma.$transaction(async (tx) => {
    for (const entry of plan.pages) {
      await tx.agencySitePage.update({ where: { id: entry.id }, data: entry.after });
    }
    for (const [id, patch] of Object.entries(BLOCK_PATCHES)) {
      const block = before.pages.flatMap((p) => p.blocks || []).find((b) => b.id === id);
      await tx.pageBlock.update({
        where: { id },
        data: {
          content: { ...(block.content || {}), ...patch },
          version: Number(block.version || 0) + 1,
        },
      });
    }
  });

  const after = await loadSite();
  assertPreconditions(after);

  const afterProtected = protectedFingerprint(after);
  if (beforeProtected !== afterProtected) {
    await restoreSnapshot(snapshot);
    throw new Error(`${CONTRACT}: protected fingerprint changed; rollback applied`);
  }
  if (routeFingerprint(after) !== EXPECTED_TOPOLOGY) {
    await restoreSnapshot(snapshot);
    throw new Error(`${CONTRACT}: route topology changed; rollback applied`);
  }
  const brandHits = futureBrandHits(after);
  if (brandHits.length) {
    await restoreSnapshot(snapshot);
    throw new Error(`${CONTRACT}: future branding detected (${brandHits.join(", ")}); rollback applied`);
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    mode: "APPLY",
    target: TARGET_SITE_SLUG,
    topologyFingerprint: routeFingerprint(after),
    protectedFingerprint: afterProtected,
    snapshot: SNAPSHOT_PATH,
    pageWrites: plan.pages.length,
    blockWrites: Object.keys(BLOCK_PATCHES).length,
    routeWrites: 0,
    agencyWrites: 0,
    futureBrandHits: brandHits,
    mutationPerformed: true,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(async () => prisma.$disconnect());
}

module.exports = {
  CONTRACT,
  TARGET_SITE_SLUG,
  EXPECTED_AGENCY_ID,
  EXPECTED_TOPOLOGY,
  FUTURE_SLUG,
  PAGE_PATCHES,
  BLOCK_PATCHES,
  routeFingerprint,
  protectedFingerprint,
  futureBrandHits,
  buildPlan,
};
