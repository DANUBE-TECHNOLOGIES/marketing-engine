"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.222";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const APPLY = String(process.env.MSE_25_222_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_222_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_222_SNAPSHOT || "/var/tmp/mse-25-222-melun-local-catchment-authority-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const REQUIRED_221_BLOCKS = Object.freeze([
  "mse25221melunserviceair",
  "mse25221melunserviceformats",
  "mse25221melunserviceprofiles",
  "mse25221melunservicecompare",
]);

const CONTENT_BLOCKS = Object.freeze([
  {
    slug: "agence",
    id: "mse25222melunlocalarea",
    name: "MSE-25.222 — Zone locale Melun",
    title: "Une agence de voyages à Melun pour les voyageurs des communes voisines",
    html: '<p>L’agence est physiquement située à Melun, au 10 Rue Saint Etienne. Elle peut aussi être un point de contact pratique pour les voyageurs de Dammarie-les-Lys, Le Mée-sur-Seine, Vaux-le-Pénil, La Rochette, Rubelles, Livry-sur-Seine ou Vert-Saint-Denis qui souhaitent échanger avec un conseiller sans multiplier les recherches entre plusieurs interlocuteurs.</p><p>Ces communes ne correspondent pas à des agences distinctes : le point d’accueil reste celui de Melun. Vous pouvez consulter les <a href="/agence/tui-store-melun/services">services de l’agence</a>, explorer les <a href="/agence/tui-store-melun/destinations">destinations</a> puis <a href="/agence/tui-store-melun/contact">préparer votre prise de contact</a>.</p>'
  },
  {
    slug: "agence",
    id: "mse25222melunlocalproject",
    name: "MSE-25.222 — Projet local",
    title: "Préparer son voyage avec un interlocuteur local",
    html: '<p>Choisir une agence proche de chez soi peut être utile lorsque le projet demande plusieurs échanges : comparaison d’itinéraires, arbitrage entre plusieurs formats de séjour, vérification des prestations incluses ou adaptation aux contraintes d’une famille, d’un couple ou d’un groupe.</p><p>Le rôle de l’agence n’est pas de remplacer votre choix, mais de vous aider à structurer les critères qui comptent réellement. Une fois ces critères clarifiés, les solutions peuvent être comparées plus efficacement selon les disponibilités et conditions applicables.</p>'
  },
  {
    slug: "destinations",
    id: "mse25222melundestinationdepartures",
    name: "MSE-25.222 — Départ et destination",
    title: "La destination dépend aussi de votre point de départ et de votre disponibilité",
    html: '<p>Pour un voyageur de Melun ou du sud de la Seine-et-Marne, une destination peut sembler attractive mais devenir moins pertinente si les horaires de transport, les correspondances, la durée totale du trajet ou les dates disponibles ne correspondent pas au projet. Le choix doit donc croiser envie de destination et contraintes concrètes.</p><p>Pour affiner votre sélection, comparez également les <a href="/agence/tui-store-melun/services">formats de voyage disponibles</a> puis échangez avec l’agence sur vos dates, votre budget et votre niveau de flexibilité.</p>'
  },
  {
    slug: "inspirations",
    id: "mse25222meluninspirationprofiles",
    name: "MSE-25.222 — Inspirations par profil",
    title: "Trouver une idée de voyage à partir de votre façon de partir",
    html: '<p>Vous n’avez pas besoin de commencer par un pays précis. Une envie de repos, de découverte culturelle, d’itinérance, de voyage en famille, de séjour à deux ou de croisière peut déjà orienter la recherche. Le format du voyage aide souvent à faire émerger les destinations les plus cohérentes.</p><p>Une fois l’idée clarifiée, confrontez-la aux <a href="/agence/tui-store-melun/destinations">destinations disponibles</a> et aux <a href="/agence/tui-store-melun/services">services proposés</a> avant de passer à une demande plus précise.</p>'
  },
  {
    slug: "contact",
    id: "mse25222meluncontactchannels",
    name: "MSE-25.222 — Canaux de contact",
    title: "Agence, téléphone ou demande de devis : choisir le bon premier contact",
    html: '<p>Selon l’avancement de votre projet, vous pouvez venir en agence, appeler directement le 01 64 39 31 07 ou utiliser la demande de devis en ligne. Un projet encore très ouvert peut nécessiter davantage d’échange, tandis qu’un besoin déjà cadré peut commencer par quelques informations précises.</p><p>Quel que soit le canal choisi, préparez si possible vos dates, la durée, le nombre de voyageurs, le budget indicatif et les critères non négociables. Cela permet d’orienter plus rapidement la comparaison.</p>'
  },
  {
    slug: "contact",
    id: "mse25222meluncontactnextstep",
    name: "MSE-25.222 — Étape suivante",
    title: "Passer d’une première demande à une comparaison utile",
    html: '<p>Après un premier échange, l’objectif est d’éviter d’accumuler des propositions difficiles à comparer. Une demande claire doit permettre d’identifier les principales différences : transport, hébergement, pension, transferts, rythme, flexibilité et conditions tarifaires.</p><p>Si plusieurs options restent pertinentes, revenez à vos priorités initiales. Le budget, le confort, la durée de trajet ou la souplesse de réservation peuvent alors départager les solutions plus efficacement.</p>'
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
    pages: ["agence", "destinations", "inspirations", "contact"].map((slug) => {
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
    predecessor221: (site.pages || []).flatMap((page) => page.blocks || []).filter((block) => REQUIRED_221_BLOCKS.includes(block.id)).map((block) => block.id).sort(),
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
  for (const slug of ["agence", "destinations", "inspirations", "contact"]) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
  }
  const existingIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  for (const requiredId of REQUIRED_221_BLOCKS) {
    if (!existingIds.has(requiredId)) throw new Error(`${CONTRACT}: prédécesseur #221 absent: ${requiredId}`);
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
        editorialKey: `mse-25.222-${entry.slug}-${index + 1}`,
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
      predecessor221Blocks: REQUIRED_221_BLOCKS.length,
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
}).finally(async () => prisma.$disconnect());
