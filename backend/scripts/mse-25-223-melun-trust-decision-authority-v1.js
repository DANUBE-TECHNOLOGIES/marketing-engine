"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.223";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const APPLY = String(process.env.MSE_25_223_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_223_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_223_SNAPSHOT || "/var/tmp/mse-25-223-melun-trust-decision-authority-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const REQUIRED_222_BLOCKS = Object.freeze([
  "mse25222melunlocalarea",
  "mse25222melunlocalproject",
  "mse25222melundestinationdepartures",
  "mse25222meluninspirationprofiles",
  "mse25222meluncontactchannels",
  "mse25222meluncontactnextstep",
]);

const CONTENT_BLOCKS = Object.freeze([
  {
    slug: "agence",
    id: "mse25223melunagencyclarity",
    name: "MSE-25.223 — Clarifier avant de choisir",
    title: "Ce qu’un échange en agence permet de clarifier avant de réserver",
    html: '<p>Un rendez-vous en agence permet surtout de transformer une demande générale en critères comparables : dates, durée, budget, rythme, type d’hébergement, pension, transport, bagages, transferts et niveau de flexibilité. Cette étape évite de comparer des offres qui ne couvrent pas réellement le même besoin.</p><p>Vous pouvez préparer cet échange en consultant les <a href="/agence/tui-store-melun/services">services proposés</a> et les <a href="/agence/tui-store-melun/destinations">destinations</a>, puis exposer les éléments qui comptent le plus pour vous.</p>'
  },
  {
    slug: "agence",
    id: "mse25223melunagencycriteria",
    name: "MSE-25.223 — Critères de décision",
    title: "Choisir une agence de voyages : quels critères regarder ?",
    html: '<p>La proximité est un critère pratique, mais elle ne suffit pas. Il est également utile d’évaluer la clarté des explications, la capacité à comparer plusieurs formats de voyage, la précision sur les prestations incluses et les conditions applicables à chaque proposition.</p><p>Les <a href="/agence/tui-store-melun/avis">avis clients</a> peuvent apporter un éclairage complémentaire. Ils restent toutefois à replacer dans votre propre projet, vos contraintes et les solutions réellement disponibles au moment de votre demande.</p>'
  },
  {
    slug: "avis",
    id: "mse25223melunreviewreading",
    name: "MSE-25.223 — Lire les avis",
    title: "Comment lire les avis sur une agence de voyages à Melun ?",
    html: '<p>Une note globale donne une première indication, mais le contenu des commentaires est souvent plus utile pour comprendre l’expérience vécue : qualité de l’accueil, écoute, clarté des explications, capacité à comprendre le projet ou qualité des échanges.</p><p>Un avis ne garantit pas que la même solution conviendra à votre voyage. Utilisez-le comme un élément de réassurance, puis vérifiez directement que l’agence peut traiter vos dates, votre budget et vos priorités.</p>'
  },
  {
    slug: "avis",
    id: "mse25223melunreviewdecision",
    name: "MSE-25.223 — Avis et décision",
    title: "Des avis clients à votre propre décision de voyage",
    html: '<p>Deux clients peuvent apprécier une même agence pour des raisons différentes et rechercher des voyages très différents. Avant de décider, revenez donc à votre besoin concret : type de séjour, niveau d’accompagnement, souplesse, confort, durée de trajet et budget.</p><p>Si les avis vous rassurent mais que votre projet reste à préciser, consultez les <a href="/agence/tui-store-melun/services">services de l’agence</a> puis <a href="/agence/tui-store-melun/contact">présentez votre demande</a> pour obtenir une comparaison adaptée à vos critères.</p>'
  },
  {
    slug: "contact",
    id: "mse25223meluncontactchecklist",
    name: "MSE-25.223 — Vérifications avant réservation",
    title: "Les points à vérifier avant de retenir une proposition",
    html: '<p>Avant de retenir une proposition, vérifiez notamment les dates et horaires, les bagages, les transferts, le type de pension, la catégorie d’hébergement, les prestations incluses, les conditions tarifaires et les éventuelles options ajoutées au dossier.</p><p>Lorsque deux solutions semblent proches, comparez-les à périmètre équivalent. Une différence de prix peut s’expliquer par le transport, le niveau de confort, les inclusions ou la flexibilité des conditions.</p>'
  },
  {
    slug: "contact",
    id: "mse25223meluncontactdecision",
    name: "MSE-25.223 — Passer au devis",
    title: "Quand passer de la recherche à une demande de devis ?",
    html: '<p>Vous n’avez pas besoin d’avoir arrêté tous les détails pour demander un devis. Dès que vous connaissez votre période, la durée approximative, le nombre de voyageurs, un budget indicatif et quelques priorités, l’agence dispose déjà d’une base utile pour travailler.</p><p>Vous pouvez <a href="/agence/tui-store-melun/demande-devis?source=general">demander un devis en ligne</a> ou appeler l’agence au 01 64 39 31 07. Plus vos critères sont hiérarchisés, plus la comparaison des propositions sera lisible.</p>'
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
    pages: ["agence", "avis", "contact"].map((slug) => {
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
    predecessor222: (site.pages || []).flatMap((page) => page.blocks || []).filter((block) => REQUIRED_222_BLOCKS.includes(block.id)).map((block) => block.id).sort(),
  });
}

function assertPreconditions(state, { allowCreatedBlocks = false } = {}) {
  const { tenant, site } = state;
  if (!site) throw new Error(`${CONTRACT}: site ${TARGET_SITE_SLUG} introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu: ${tenant.id}`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (normalize(site.agency?.city) !== normalize(EXPECTED_CITY)) throw new Error(`${CONTRACT}: ville inattendue: ${site.agency?.city}`);
  if (String(site.agency?.postalCode || "") !== EXPECTED_POSTAL_CODE) throw new Error(`${CONTRACT}: code postal inattendu`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu`);
  for (const slug of ["agence", "avis", "contact"]) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
  }
  const existingIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  for (const requiredId of REQUIRED_222_BLOCKS) {
    if (!existingIds.has(requiredId)) throw new Error(`${CONTRACT}: prédécesseur #222 absent: ${requiredId}`);
  }
  const targetIds = new Set(CONTENT_BLOCKS.map((entry) => entry.id));
  const existingTargets = [...existingIds].filter((id) => targetIds.has(id));
  if (!allowCreatedBlocks && existingTargets.length) throw new Error(`${CONTRACT}: un bloc cible existe déjà; APPLY refusé: ${existingTargets.join(", ")}`);
  const publicStrings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_PUBLIC_BRANDS) {
    if (publicStrings.some((value) => value.includes(forbidden))) throw new Error(`${CONTRACT}: branding futur détecté avant le 01/10: ${forbidden}`);
  }
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
      content: {
        title: entry.title,
        html: entry.html,
        alignment: "left",
        editorialKey: `mse-25.223-${entry.slug}-${index + 1}`,
      },
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
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.agencyId !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: snapshot non conforme à Melun`);
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
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      guardFingerprint: fingerprint,
      predecessor222Blocks: REQUIRED_222_BLOCKS.length,
      blockCreates: plan.length,
      targetPages: [...new Set(plan.map((entry) => entry.slug))].length,
      routeWrites: 0,
      agencyWrites: 0,
      pageSeoWrites: 0,
      plan,
      mutationPerformed: false,
    }, null, 2));
    return;
  }

  const justBefore = await loadState();
  assertPreconditions(justBefore);
  if (guardFingerprint(justBefore.site) !== fingerprint) throw new Error(`${CONTRACT}: état Melun modifié entre précontrôle et APPLY`);

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    guardFingerprint: fingerprint,
    createdBlockIds: plan.map((entry) => entry.id),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of plan) {
        await tx.pageBlock.create({
          data: {
            id: entry.id,
            pageId: entry.pageId,
            blockType: entry.blockType,
            name: entry.name,
            content: entry.content,
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
    assertPreconditions(after, { allowCreatedBlocks: true });
    for (const entry of plan) {
      const page = pageBySlug(after.site, entry.slug);
      const block = (page.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block) throw new Error(`${CONTRACT}: bloc créé absent: ${entry.id}`);
      if (block.blockType !== "rich_text" || block.status !== "published") throw new Error(`${CONTRACT}: bloc invalide: ${entry.id}`);
      if (!block.visibleDesktop || !block.visibleMobile) throw new Error(`${CONTRACT}: visibilité invalide: ${entry.id}`);
      if (block.content?.title !== entry.title || block.content?.html !== entry.html) throw new Error(`${CONTRACT}: contenu invalide: ${entry.id}`);
    }
  } catch (error) {
    await rollback(snapshot);
    throw new Error(`${CONTRACT}: validation post-APPLY échouée; rollback automatique effectué: ${error.message}`);
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    mode: "APPLY",
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    originalGuardFingerprint: fingerprint,
    blockCreates: plan.length,
    targetPages: [...new Set(plan.map((entry) => entry.slug))].length,
    routeWrites: 0,
    agencyWrites: 0,
    pageSeoWrites: 0,
    mutationPerformed: true,
    snapshot: SNAPSHOT_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
