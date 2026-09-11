"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.225";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "ambassade-fram-mondescale-maurepas";
const EXPECTED_AGENCY_ID = 1;
const EXPECTED_CITY = "Maurepas";
const EXPECTED_POSTAL_CODE = "78310";
const APPLY = String(process.env.MSE_25_225_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_225_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_225_SNAPSHOT || "/var/tmp/mse-25-225-maurepas-final-local-commercial-authority-v1.snapshot.json";

const FORBIDDEN_MELUN_MARKERS = [
  "tui-store-melun",
  "10 rue Saint-Étienne",
  "77000 Melun",
  "01 64 39 31 07",
  "agencemelun@tuifrance.com",
];

const CONTENT_BLOCKS = Object.freeze([
  {
    slug: "agence",
    id: "mse25225maurepaslocalarea",
    name: "MSE-25.225 — Maurepas zone locale",
    title: "Votre agence de voyages à Maurepas et dans l’ouest de Saint-Quentin-en-Yvelines",
    html: '<p>Installée à Maurepas, notre agence accueille les voyageurs de la commune et accompagne également des projets venant d’Élancourt, Coignières, La Verrière, Jouars-Pontchartrain, Le Mesnil-Saint-Denis et Trappes. Ces communes ne correspondent pas à des agences distinctes : votre point de contact reste l’équipe de Maurepas, au 6 place du Sancerrois.</p><p>Cette proximité permet de préparer un voyage avec un interlocuteur identifié, puis de conserver le même point de contact pour les échanges liés à la réservation et au suivi du dossier. Vous pouvez aussi <a href="/agence/ambassade-fram-mondescale-maurepas/equipe">découvrir l’équipe</a> ou <a href="/agence/ambassade-fram-mondescale-maurepas/contact">contacter l’agence de Maurepas</a>.</p>'
  },
  {
    slug: "services",
    id: "mse25225maurepasserviceformats",
    name: "MSE-25.225 — Maurepas formats de voyage",
    title: "Du séjour au voyage itinérant : choisir le format adapté à votre projet",
    html: '<p>Le bon format dépend autant de votre manière de voyager que de la destination. Un club ou un séjour all inclusive peut convenir lorsque vous recherchez un cadre simple et des prestations regroupées ; un circuit accompagné apporte un itinéraire organisé ; un autotour laisse davantage de liberté entre les étapes ; une réservation d’hôtel peut répondre à un séjour plus autonome.</p><p>Pour un voyage sur mesure, une croisière, un voyage en famille, un voyage de noces ou un projet de groupe, l’équipe de Maurepas peut partir de vos dates, de votre budget et de vos priorités pour comparer les solutions pertinentes. Consultez aussi nos <a href="/agence/ambassade-fram-mondescale-maurepas/destinations">destinations</a> avant de présenter votre projet.</p>'
  },
  {
    slug: "inspirations",
    id: "mse25225maurepasinspirationprofiles",
    name: "MSE-25.225 — Maurepas inspirations",
    title: "Trouver une idée de voyage à partir de votre façon de partir",
    html: '<p>Une inspiration de voyage devient réellement utile lorsqu’elle correspond à votre rythme et à vos contraintes. Avant de choisir une destination, demandez-vous si vous recherchez surtout du repos, des découvertes, plusieurs étapes, un voyage en famille, une expérience à deux ou davantage d’autonomie.</p><p>La période disponible, la durée du séjour, le budget, le temps de transport accepté et le niveau de confort souhaité permettent ensuite d’écarter les idées moins adaptées. L’équipe de Maurepas peut vous aider à transformer ces premières envies en critères de recherche puis à <a href="/agence/ambassade-fram-mondescale-maurepas/contact">préparer un échange sur votre projet</a>.</p>'
  },
  {
    slug: "avis",
    id: "mse25225maurepasreviewcontinuity",
    name: "MSE-25.225 — Maurepas avis et continuité",
    title: "Des avis clients à votre échange avec l’équipe de Maurepas",
    html: '<p>Les avis clients donnent un aperçu d’expériences déjà vécues avec l’agence, mais votre décision doit aussi tenir compte de votre propre projet. Les dates, le budget, le type de voyage et les priorités peuvent modifier les solutions à comparer.</p><p>À Maurepas, l’intérêt d’un échange avec l’équipe est de pouvoir préciser ces critères avec un interlocuteur identifié et de savoir comment le dossier pourra être suivi après la réservation. Après avoir consulté les retours disponibles, vous pouvez <a href="/agence/ambassade-fram-mondescale-maurepas/contact">contacter l’agence</a> pour présenter votre demande.</p>'
  }
]);

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
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

function guardFingerprint(site) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status, agencyId: site.agencyId },
    agency: { id: site.agency?.id, city: site.agency?.city, postalCode: site.agency?.postalCode },
    pages: ["agence", "services", "inspirations", "avis"].map((slug) => {
      const page = pageBySlug(site, slug);
      return page ? {
        id: page.id,
        slug: page.slug,
        status: page.status,
        published: page.published,
        blocks: (page.blocks || []).map((block) => ({
          id: block.id,
          blockType: block.blockType,
          name: block.name,
          status: block.status,
          visibleDesktop: block.visibleDesktop,
          visibleMobile: block.visibleMobile,
          displayOrder: block.displayOrder,
        }))
      } : null;
    }),
  });
}

function assertPreconditions(state, { allowCreatedBlocks = false } = {}) {
  const { tenant, site } = state;
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu: ${tenant.id}`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (String(site.agency?.postalCode || "") !== EXPECTED_POSTAL_CODE) throw new Error(`${CONTRACT}: code postal inattendu`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);
  for (const slug of ["agence", "services", "inspirations", "avis"]) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
  }
  const existingIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  const targetIds = new Set(CONTENT_BLOCKS.map((entry) => entry.id));
  const existingTargets = [...existingIds].filter((id) => targetIds.has(id));
  if (!allowCreatedBlocks && existingTargets.length) throw new Error(`${CONTRACT}: un bloc cible existe déjà; APPLY refusé: ${existingTargets.join(", ")}`);
  const strings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_MELUN_MARKERS) {
    if (strings.some((value) => value.includes(forbidden))) throw new Error(`${CONTRACT}: contamination Melun détectée: ${forbidden}`);
  }
  if (!strings.some((value) => value.includes("Anisia"))) throw new Error(`${CONTRACT}: identité équipe attendue absente: Anisia`);
}

function buildPlan(state) {
  const counters = new Map();
  return CONTENT_BLOCKS.map((entry, index) => {
    const page = pageBySlug(state.site, entry.slug);
    if (!counters.has(entry.slug)) {
      const orders = (page.blocks || []).map((block) => Number(block.displayOrder)).filter(Number.isFinite);
      counters.set(entry.slug, orders.length ? Math.max(...orders) : 0);
    }
    const nextOrder = counters.get(entry.slug) + 10;
    counters.set(entry.slug, nextOrder);
    return {
      ...entry,
      pageId: page.id,
      displayOrder: nextOrder,
      blockType: "rich_text",
      content: { title: entry.title, html: entry.html, alignment: "left", editorialKey: `mse-25.225-${entry.slug}-${index + 1}` },
    };
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
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.agencyId !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: snapshot non conforme à Maurepas`);
    await rollback(snapshot);
    const restored = await loadState();
    assertPreconditions(restored);
    if (guardFingerprint(restored.site) !== snapshot.guardFingerprint) throw new Error(`${CONTRACT}: état protégé non restauré après rollback`);
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadState();
  assertPreconditions(before);
  const fingerprint = guardFingerprint(before.site);
  const plan = buildPlan(before);
  if (!APPLY) {
    console.log(JSON.stringify({ contract: CONTRACT, mode: "DRY_RUN", target: TARGET_SITE_SLUG, agencyId: before.site.agencyId, guardFingerprint: fingerprint, blockCreates: plan.length, targetPages: [...new Set(plan.map((entry) => entry.slug))].length, routeWrites: 0, agencyWrites: 0, pageSeoWrites: 0, plan, mutationPerformed: false }, null, 2));
    return;
  }

  const justBefore = await loadState();
  assertPreconditions(justBefore);
  if (guardFingerprint(justBefore.site) !== fingerprint) throw new Error(`${CONTRACT}: état Maurepas modifié entre précontrôle et APPLY`);
  const snapshot = { contract: CONTRACT, createdAt: new Date().toISOString(), target: TARGET_SITE_SLUG, agencyId: EXPECTED_AGENCY_ID, guardFingerprint: fingerprint, createdBlockIds: plan.map((entry) => entry.id) };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of plan) {
        await tx.pageBlock.create({ data: { id: entry.id, pageId: entry.pageId, blockType: entry.blockType, name: entry.name, content: entry.content, settings: {}, seo: {}, displayOrder: entry.displayOrder, status: "published", visibleDesktop: true, visibleMobile: true, version: 1 } });
      }
    });
    const after = await loadState();
    assertPreconditions(after, { allowCreatedBlocks: true });
    for (const entry of plan) {
      const page = pageBySlug(after.site, entry.slug);
      const block = (page.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block) throw new Error(`${CONTRACT}: bloc créé absent: ${entry.id}`);
      if (block.blockType !== "rich_text" || block.status !== "published" || !block.visibleDesktop || !block.visibleMobile) throw new Error(`${CONTRACT}: bloc créé invalide: ${entry.id}`);
      if (block.content?.title !== entry.title || block.content?.html !== entry.html) throw new Error(`${CONTRACT}: contenu créé invalide: ${entry.id}`);
    }
  } catch (error) {
    await rollback(snapshot);
    throw new Error(`${CONTRACT}: validation post-APPLY échouée; rollback automatique effectué: ${error.message}`);
  }

  console.log(JSON.stringify({ contract: CONTRACT, mode: "APPLY", target: TARGET_SITE_SLUG, agencyId: EXPECTED_AGENCY_ID, originalGuardFingerprint: fingerprint, blockCreates: plan.length, targetPages: [...new Set(plan.map((entry) => entry.slug))].length, routeWrites: 0, agencyWrites: 0, pageSeoWrites: 0, mutationPerformed: true, snapshot: SNAPSHOT_PATH }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
