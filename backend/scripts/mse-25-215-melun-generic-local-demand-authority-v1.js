"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.215";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const EXPECTED_ADDRESS = "10 Rue Saint Etienne";
const APPLY = String(process.env.MSE_25_215_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_215_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH =
  process.env.MSE_25_215_SNAPSHOT ||
  "/var/tmp/mse-25-215-melun-generic-local-demand-authority-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const LOCAL_AREA = Object.freeze([
  "Melun",
  "Dammarie-les-Lys",
  "Le Mée-sur-Seine",
  "Vaux-le-Pénil",
  "La Rochette",
  "Rubelles",
  "Vert-Saint-Denis",
]);

const PAGE_PATCHES = Object.freeze({
  "": {
    seoTitle: "Agence de voyages Melun | Billets d’avion, séjours, circuits & croisières",
    metaDescription:
      "Agence de voyages à Melun pour billets d’avion, séjours, circuits, croisières, autotours et voyages sur mesure. Conseil, devis et accompagnement en agence.",
    h1: "Agence de voyages à Melun : construisons votre prochain voyage",
  },
  services: {
    seoTitle: "Billetterie, séjours, circuits & croisières à Melun | Agence de voyages",
    metaDescription:
      "Billetterie aérienne, séjours, clubs, circuits, croisières, autotours, groupes et voyages sur mesure à Melun : découvrez les services de votre agence.",
    h1: "Billetterie et services voyage à Melun",
  },
  destinations: {
    seoTitle: "Destinations, circuits & voyages sur mesure à Melun | Conseils",
    metaDescription:
      "Trouvez votre prochaine destination avec votre agence à Melun : séjour, circuit, autotour, croisière ou itinéraire sur mesure selon vos envies et votre budget.",
    h1: "Destinations et idées de voyages depuis Melun",
  },
  inspirations: {
    seoTitle: "Idées de séjours, circuits & croisières | Agence de voyages Melun",
    metaDescription:
      "Inspirez votre prochain voyage depuis Melun : séjours, circuits, croisières, autotours et projets sur mesure à étudier avec un conseiller en agence.",
    h1: "Idées de voyages et inspirations à Melun",
  },
  avis: {
    seoTitle: "Avis agence de voyages Melun | Expériences clients",
    metaDescription:
      "Consultez les avis des voyageurs accompagnés par votre agence à Melun et découvrez leur expérience avant de préparer votre séjour, circuit ou voyage sur mesure.",
    h1: "Avis clients de votre agence de voyages à Melun",
  },
  contact: {
    seoTitle: "Agence de voyages Melun : contact, devis & rendez-vous",
    metaDescription:
      "Contactez votre agence de voyages à Melun pour demander un devis, préparer un rendez-vous ou échanger sur un séjour, un circuit, une croisière ou un vol.",
    h1: "Contact, devis et rendez-vous avec votre agence à Melun",
  },
});

const BLOCK_PATCHES = Object.freeze({
  mse25125bnmelunhome: {
    title: "Votre agence de voyages à Melun pour aller plus loin qu’une simple recherche en ligne",
    html:
      '<p>Vous cherchez une agence de voyages à Melun pour comparer un séjour, un circuit, une croisière, un autotour, un voyage sur mesure ou des billets d’avion ? Votre conseiller vous aide à transformer une envie en projet concret, en tenant compte de vos dates, de votre budget, du rythme souhaité et des prestations réellement disponibles.</p>' +
      '<p>Depuis Melun, l’agence accueille également les voyageurs de Dammarie-les-Lys, Le Mée-sur-Seine, Vaux-le-Pénil, La Rochette, Rubelles et Vert-Saint-Denis. Pour avancer, vous pouvez <a href="/agence/tui-store-melun/services">découvrir nos services voyage</a>, consulter nos <a href="/agence/tui-store-melun/destinations">destinations et idées de voyage</a>, parcourir nos <a href="/agence/tui-store-melun/inspiration">inspirations</a> ou lire les <a href="/agence/tui-store-melun/avis">avis de nos voyageurs</a>.</p>' +
      '<p>Vous avez déjà une destination en tête ou simplement une période de départ ? <a href="/agence/tui-store-melun/contact">Contactez l’agence à Melun</a> pour demander un devis ou préparer un rendez-vous.</p>',
  },
  mse25125bnmelunservices: {
    title: "Billets d’avion, séjours, circuits, croisières et voyages sur mesure à Melun",
    html:
      '<p>La billetterie aérienne fait partie des services proposés par votre agence à Melun, au même titre que les séjours et clubs, circuits accompagnés, croisières, autotours, voyages de noces, vacances en famille, voyages en groupe et projets sur mesure. Le conseil porte autant sur le choix du produit que sur les prestations incluses, les conditions tarifaires et les contraintes utiles à votre décision.</p>' +
      '<p>Pour un projet plus complexe, votre conseiller peut comparer différentes façons de voyager : séjour fixe ou itinérant, circuit organisé ou autotour, croisière ou voyage personnalisé. Explorez les <a href="/agence/tui-store-melun/destinations">destinations actuellement présentées</a> et les <a href="/agence/tui-store-melun/inspiration">idées de voyages</a>, puis <a href="/agence/tui-store-melun/contact">contactez l’agence</a> pour préciser vos dates, votre budget et vos priorités.</p>',
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function allStrings(value, acc = []) {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, acc));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => allStrings(item, acc));
  return acc;
}

async function loadState() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable: ${TENANT_SLUG}`);

  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: {
        orderBy: { displayOrder: "asc" },
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  return { tenant, site };
}

function pageBySlug(site, slug) {
  return (site?.pages || []).find((page) => String(page.slug ?? "") === slug) || null;
}

function blockById(site, id) {
  return (site?.pages || []).flatMap((page) => page.blocks || []).find((block) => block.id === id) || null;
}

function topologyFingerprint(site) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status },
    pages: (site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      status: page.status,
      published: page.published,
      schemaType: page.schemaType,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        name: block.name,
        blockType: block.blockType,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        displayOrder: block.displayOrder,
      })),
    })),
  });
}

function protectedFingerprint(state) {
  const targetPages = new Set(Object.keys(PAGE_PATCHES));
  const targetBlocks = new Set(Object.keys(BLOCK_PATCHES));

  return hash({
    tenant: { id: state.tenant.id, slug: state.tenant.slug },
    site: {
      id: state.site.id,
      slug: state.site.slug,
      basePath: state.site.basePath,
      status: state.site.status,
      theme: state.site.theme,
      agencyId: state.site.agencyId,
    },
    agency: state.site.agency,
    pages: (state.site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      title: page.title,
      menuTitle: page.menuTitle,
      menuLocation: page.menuLocation,
      displayOrder: page.displayOrder,
      schemaType: page.schemaType,
      status: page.status,
      published: page.published,
      seoTitle: targetPages.has(String(page.slug ?? "")) ? "__TARGET__" : page.seoTitle,
      metaDescription: targetPages.has(String(page.slug ?? "")) ? "__TARGET__" : page.metaDescription,
      h1: targetPages.has(String(page.slug ?? "")) ? "__TARGET__" : page.h1,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        blockType: block.blockType,
        name: block.name,
        content: targetBlocks.has(block.id)
          ? { ...clone(block.content || {}), title: "__TARGET__", html: "__TARGET__" }
          : block.content,
        settings: block.settings,
        seo: block.seo,
        displayOrder: block.displayOrder,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: targetBlocks.has(block.id) ? "__TARGET__" : block.version,
      })),
    })),
  });
}

function assertPreconditions(state) {
  const { tenant, site } = state;
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu: ${tenant.id}`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: mauvais siteSlug`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (String(site.agency?.postalCode || "") !== EXPECTED_POSTAL_CODE) throw new Error(`${CONTRACT}: code postal inattendu`);
  if (normalize(site.agency?.address) !== normalize(EXPECTED_ADDRESS)) throw new Error(`${CONTRACT}: adresse inattendue`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);

  for (const slug of Object.keys(PAGE_PATCHES)) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) {
      throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug || "HOME"}`);
    }
  }

  for (const id of Object.keys(BLOCK_PATCHES)) {
    const block = blockById(site, id);
    if (!block) throw new Error(`${CONTRACT}: bloc cible introuvable: ${id}`);
    if (block.blockType !== "rich_text") throw new Error(`${CONTRACT}: type bloc inattendu pour ${id}: ${block.blockType}`);
    if (block.status !== "published") throw new Error(`${CONTRACT}: bloc cible non publié: ${id}`);
  }

  const publicStrings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_PUBLIC_BRANDS) {
    if (publicStrings.some((value) => value.includes(forbidden))) {
      throw new Error(`${CONTRACT}: branding futur détecté avant le 01/10: ${forbidden}`);
    }
  }
}

function buildPlan(state) {
  const pages = Object.entries(PAGE_PATCHES).map(([slug, after]) => {
    const page = pageBySlug(state.site, slug);
    return {
      id: page.id,
      slug,
      before: {
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
        h1: page.h1,
      },
      after,
    };
  });

  const blocks = Object.entries(BLOCK_PATCHES).map(([id, after]) => {
    const block = blockById(state.site, id);
    return {
      id,
      before: {
        title: block.content?.title || null,
        html: block.content?.html || null,
        version: block.version,
      },
      after,
    };
  });

  return { pages, blocks };
}

async function restore(snapshot) {
  await prisma.$transaction(async (tx) => {
    for (const page of snapshot.pages || []) {
      await tx.agencySitePage.update({
        where: { id: page.id },
        data: {
          seoTitle: page.seoTitle,
          metaDescription: page.metaDescription,
          h1: page.h1,
        },
      });
    }

    for (const block of snapshot.blocks || []) {
      await tx.pageBlock.update({
        where: { id: block.id },
        data: { content: block.content, version: block.version },
      });
    }
  });
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error(`${CONTRACT}: APPLY et ROLLBACK exclusifs`);

  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || Number(snapshot.agencyId) !== EXPECTED_AGENCY_ID) {
      throw new Error(`${CONTRACT}: snapshot incompatible`);
    }
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
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      topologyFingerprint: beforeTopology,
      protectedFingerprint: beforeProtected,
      localArea: LOCAL_AREA,
      pageWrites: plan.pages.length,
      blockWrites: plan.blocks.length,
      plan,
      mutationPerformed: false,
    }, null, 2));
    return;
  }

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    topologyFingerprint: beforeTopology,
    protectedFingerprint: beforeProtected,
    pages: plan.pages.map((entry) => ({ id: entry.id, ...entry.before })),
    blocks: plan.blocks.map((entry) => {
      const block = blockById(before.site, entry.id);
      return { id: block.id, content: clone(block.content), version: block.version };
    }),
  };

  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });

  await prisma.$transaction(async (tx) => {
    for (const entry of plan.pages) {
      await tx.agencySitePage.update({ where: { id: entry.id }, data: entry.after });
    }

    for (const [id, patch] of Object.entries(BLOCK_PATCHES)) {
      const block = blockById(before.site, id);
      await tx.pageBlock.update({
        where: { id },
        data: {
          content: { ...clone(block.content || {}), ...patch },
          version: Number(block.version || 0) + 1,
        },
      });
    }
  });

  const after = await loadState();

  try {
    assertPreconditions(after);
    if (topologyFingerprint(after.site) !== beforeTopology) throw new Error(`${CONTRACT}: topologie modifiée`);
    if (protectedFingerprint(after) !== beforeProtected) throw new Error(`${CONTRACT}: champ protégé modifié`);

    for (const [slug, expected] of Object.entries(PAGE_PATCHES)) {
      const page = pageBySlug(after.site, slug);
      for (const [key, value] of Object.entries(expected)) {
        if (page[key] !== value) throw new Error(`${CONTRACT}: valeur page inattendue ${slug || "HOME"}.${key}`);
      }
    }

    for (const [id, expected] of Object.entries(BLOCK_PATCHES)) {
      const block = blockById(after.site, id);
      if (block.content?.title !== expected.title || block.content?.html !== expected.html) {
        throw new Error(`${CONTRACT}: valeur bloc inattendue ${id}`);
      }
    }
  } catch (error) {
    await restore(snapshot);
    throw new Error(`${error.message}; rollback automatique effectué`);
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    mode: "APPLY",
    target: TARGET_SITE_SLUG,
    agencyId: after.site.agencyId,
    topologyFingerprint: topologyFingerprint(after.site),
    protectedFingerprint: protectedFingerprint(after),
    localArea: LOCAL_AREA,
    pageWrites: plan.pages.length,
    blockWrites: plan.blocks.length,
    routeWrites: 0,
    agencyWrites: 0,
    mutationPerformed: true,
    snapshot: SNAPSHOT_PATH,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
