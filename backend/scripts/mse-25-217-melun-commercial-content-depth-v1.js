"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.217";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const EXPECTED_TOPOLOGY_FINGERPRINT = "06072a84a232869e738107683549a3c5978418ebadcbc4aa8b7529c0dec9e100";
const APPLY = String(process.env.MSE_25_217_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_217_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_217_SNAPSHOT || "/var/tmp/mse-25-217-melun-commercial-content-depth-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const CONTENT_BLOCKS = Object.freeze({
  agence: {
    id: "mse25217melunagency",
    name: "MSE-25.217 — Autorité locale agence",
    title: "Une agence de voyages au cœur de Melun",
    html:
      '<p>Installée au 10 Rue Saint Etienne à Melun, l’agence vous permet d’échanger directement avec un conseiller sur votre projet de voyage : choix d’un séjour, construction d’un circuit, croisière, billets d’avion ou voyage sur mesure. L’objectif est de confronter vos envies aux prestations réellement disponibles et de clarifier les conditions utiles avant de réserver.</p>' +
      '<p>Cette présence locale est également pratique pour les voyageurs de Dammarie-les-Lys, Le Mée-sur-Seine, Vaux-le-Pénil, La Rochette, Rubelles et Vert-Saint-Denis. Découvrez les <a href="/agence/tui-store-melun/services">services proposés à Melun</a>, consultez les <a href="/agence/tui-store-melun/avis">avis clients</a> ou <a href="/agence/tui-store-melun/contact">contactez l’agence</a> pour préparer votre projet.</p>',
  },
  destinations: {
    id: "mse25217melundestinations",
    name: "MSE-25.217 — Profondeur commerciale destinations",
    title: "Choisir une destination selon votre façon de voyager",
    html:
      '<p>Une destination ne se choisit pas seulement sur une photo ou un prix d’appel. La période de départ, la durée du séjour, le niveau de confort, le rythme souhaité, les formalités, les liaisons aériennes et le budget peuvent orienter vers des solutions très différentes. À Melun, votre conseiller peut vous aider à comparer un séjour en club, un circuit accompagné, un autotour, une croisière ou un itinéraire personnalisé.</p>' +
      '<p>Si vous hésitez encore, parcourez nos <a href="/agence/tui-store-melun/inspiration">inspirations voyage</a>. Si votre projet est déjà plus précis, retrouvez nos <a href="/agence/tui-store-melun/services">services voyage</a> puis <a href="/agence/tui-store-melun/contact">échangez avec l’agence</a> sur vos dates, votre budget et vos priorités.</p>',
  },
  inspirations: {
    id: "mse25217meluninspirations",
    name: "MSE-25.217 — Transformation inspiration projet",
    title: "De l’idée de voyage au projet concret",
    html:
      '<p>Une inspiration est un point de départ. Votre projet peut ensuite évoluer selon la saison, la durée disponible, les aéroports de départ, le budget, la composition des voyageurs ou le niveau d’accompagnement recherché. L’agence de Melun vous aide à passer d’une envie générale à une sélection de solutions comparables.</p>' +
      '<p>Vous pouvez ainsi partir d’une envie de soleil, d’un circuit culturel, d’une croisière, d’un voyage de noces, d’un autotour ou de vacances en famille, puis préciser progressivement le projet. Consultez également nos <a href="/agence/tui-store-melun/destinations">destinations</a> et <a href="/agence/tui-store-melun/contact">contactez l’agence</a> lorsque vous souhaitez transformer l’inspiration en devis.</p>',
  },
  avis: {
    id: "mse25217melunreviews",
    name: "MSE-25.217 — Confiance et avis clients",
    title: "Les avis pour préparer votre choix d’agence de voyages à Melun",
    html:
      '<p>Les avis clients permettent de mieux comprendre l’expérience vécue avec l’agence : qualité de l’accueil, écoute du projet, clarté des explications et accompagnement dans la préparation du voyage. Ils complètent les informations pratiques et commerciales sans remplacer l’étude de votre propre dossier.</p>' +
      '<p>Chaque voyage ayant ses contraintes, le meilleur moyen de vérifier si une solution correspond à vos attentes reste d’exposer vos dates, votre budget et vos priorités. Vous pouvez consulter nos <a href="/agence/tui-store-melun/services">services</a> puis <a href="/agence/tui-store-melun/contact">contacter l’agence de Melun</a> pour avancer sur votre projet.</p>',
  },
  contact: {
    id: "mse25217meluncontact",
    name: "MSE-25.217 — Préparation du contact",
    title: "Bien préparer votre demande de voyage",
    html:
      '<p>Pour permettre à votre conseiller de cibler rapidement les solutions pertinentes, préparez si possible votre période de départ, la durée souhaitée, le nombre et l’âge des voyageurs, votre budget indicatif ainsi que vos priorités : vol direct, type de pension, catégorie d’hébergement, rythme du circuit, bagages ou besoins particuliers.</p>' +
      '<p>Vous n’avez pas encore arrêté votre destination ? Ce n’est pas nécessaire : partez de vos envies et de vos contraintes. Vous pouvez d’abord explorer nos <a href="/agence/tui-store-melun/destinations">destinations</a> et nos <a href="/agence/tui-store-melun/inspiration">inspirations</a>. L’agence de Melun pourra ensuite vous aider à structurer la demande avant l’établissement d’une proposition.</p>',
  },
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value).sort().reduce((acc, key) => {
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
  return (site?.pages || []).find((page) => String(page.slug || "") === slug) || null;
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

function assertPreconditions(state, { allowCreatedBlocks = false } = {}) {
  const { tenant, site } = state;
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu: ${tenant.id}`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: mauvais siteSlug`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (String(site.agency?.postalCode || "") !== EXPECTED_POSTAL_CODE) throw new Error(`${CONTRACT}: code postal inattendu`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu`);

  for (const slug of Object.keys(CONTENT_BLOCKS)) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) {
      throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
    }
  }

  const targetIds = new Set(Object.values(CONTENT_BLOCKS).map((entry) => entry.id));
  const existing = (site.pages || []).flatMap((page) => page.blocks || []).filter((block) => targetIds.has(block.id));
  if (!allowCreatedBlocks && existing.length) {
    throw new Error(`${CONTRACT}: un bloc cible existe déjà; APPLY refusé: ${existing.map((block) => block.id).join(", ")}`);
  }

  const publicStrings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_PUBLIC_BRANDS) {
    if (publicStrings.some((value) => value.includes(forbidden))) {
      throw new Error(`${CONTRACT}: branding futur détecté avant le 01/10: ${forbidden}`);
    }
  }
}

function buildPlan(state) {
  return Object.entries(CONTENT_BLOCKS).map(([slug, content]) => {
    const page = pageBySlug(state.site, slug);
    const currentOrders = (page.blocks || []).map((block) => Number(block.displayOrder)).filter(Number.isFinite);
    const displayOrder = (currentOrders.length ? Math.max(...currentOrders) : 0) + 20;
    return { slug, pageId: page.id, displayOrder, ...content };
  });
}

async function rollback(snapshot) {
  const ids = Array.isArray(snapshot?.createdBlockIds) ? snapshot.createdBlockIds : [];
  if (!ids.length) throw new Error(`${CONTRACT}: snapshot sans blocs créés`);
  await prisma.pageBlock.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error(`${CONTRACT}: APPLY et ROLLBACK exclusifs`);

  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.agencyId !== EXPECTED_AGENCY_ID) {
      throw new Error(`${CONTRACT}: snapshot non conforme à Melun`);
    }
    await rollback(snapshot);
    const restored = await loadState();
    assertPreconditions(restored);
    if (topologyFingerprint(restored.site) !== snapshot.topologyFingerprint) {
      throw new Error(`${CONTRACT}: topologie non restaurée après rollback`);
    }
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", target: TARGET_SITE_SLUG, restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadState();
  assertPreconditions(before);
  const beforeTopology = topologyFingerprint(before.site);
  if (beforeTopology !== EXPECTED_TOPOLOGY_FINGERPRINT) {
    throw new Error(`${CONTRACT}: topologie Melun inattendue; attendu ${EXPECTED_TOPOLOGY_FINGERPRINT}, reçu ${beforeTopology}`);
  }

  const plan = buildPlan(before);

  if (!APPLY) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      topologyFingerprint: beforeTopology,
      blockCreates: plan.length,
      routeWrites: 0,
      agencyWrites: 0,
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
    createdBlockIds: plan.map((entry) => entry.id),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

  await prisma.$transaction(async (tx) => {
    for (const entry of plan) {
      await tx.pageBlock.create({
        data: {
          id: entry.id,
          pageId: entry.pageId,
          blockType: "rich_text",
          name: entry.name,
          content: {
            title: entry.title,
            html: entry.html,
            alignment: "left",
            editorialKey: `mse-25.217-${entry.slug}`,
          },
          settings: {},
          seo: {},
          displayOrder: entry.displayOrder,
          status: "published",
          visibleDesktop: true,
          visibleMobile: true,
          version: 1,
        },
      });
    }
  });

  const after = await loadState();
  try {
    assertPreconditions(after, { allowCreatedBlocks: true });
    for (const entry of plan) {
      const page = pageBySlug(after.site, entry.slug);
      const block = (page.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block) throw new Error(`${CONTRACT}: bloc créé absent: ${entry.id}`);
      if (block.blockType !== "rich_text" || block.status !== "published") throw new Error(`${CONTRACT}: état bloc invalide: ${entry.id}`);
      if (block.content?.title !== entry.title || block.content?.html !== entry.html) throw new Error(`${CONTRACT}: contenu bloc invalide: ${entry.id}`);
    }
  } catch (error) {
    await rollback(snapshot);
    throw new Error(`${error.message}; rollback automatique effectué`);
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    mode: "APPLY",
    target: TARGET_SITE_SLUG,
    agencyId: after.site.agencyId,
    originalTopologyFingerprint: beforeTopology,
    blockCreates: plan.length,
    routeWrites: 0,
    agencyWrites: 0,
    mutationPerformed: true,
    snapshot: SNAPSHOT_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
