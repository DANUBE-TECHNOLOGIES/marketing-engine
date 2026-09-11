"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.212";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_ADDRESS = "10 Rue Saint Etienne";
const EXPECTED_POSTAL_CODE = "77000";
const EXPECTED_LEGAL_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske";
const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "Ambassade FRAM - Mondescale Maurepas",
];
const APPLY = String(process.env.MSE_25_212_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_212_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_212_SNAPSHOT || "/var/tmp/mse-25-212-melun-geo-conversion-authority-v1.snapshot.json";

const GEO_REFERENCE = Object.freeze({
  latitude: 48.53612,
  longitude: 2.65823,
  source: "OpenStreetMap node 13202447292",
  mutation: false,
  reason: "Agency/AgencySite Prisma models do not currently expose latitude/longitude; no shared schema migration is performed in this Melun-isolated PR.",
});

const LOCAL_AREA = Object.freeze([
  "Dammarie-les-Lys",
  "Le Mée-sur-Seine",
  "Vaux-le-Pénil",
  "La Rochette",
  "Rubelles",
  "Vert-Saint-Denis",
]);

const PAGE_DB_SLUGS = Object.freeze({
  home: "",
  services: "services",
  contact: "contact",
});

const FAQ_PATCHES = Object.freeze({
  home: [
    {
      question: "Où se trouve votre agence de voyages à Melun ?",
      answer: "L’agence vous accueille au 10 Rue Saint Etienne, 77000 Melun. Vous pouvez la contacter avant votre venue pour préparer votre projet ou convenir d’un rendez-vous.",
    },
    {
      question: "Votre agence accompagne-t-elle aussi les voyageurs autour de Melun ?",
      answer: "Oui. L’agence accueille notamment des voyageurs de Dammarie-les-Lys, Le Mée-sur-Seine, Vaux-le-Pénil, La Rochette, Rubelles et Vert-Saint-Denis, ainsi que plus largement du bassin melunais.",
    },
    {
      question: "Quels types de voyages pouvez-vous préparer en agence ?",
      answer: "L’agence peut étudier des séjours et clubs, circuits, croisières, autotours, voyages sur mesure, voyages en famille ou de noces, voyages en groupe et billets d’avion, selon les disponibilités et conditions des partenaires référencés.",
    },
    {
      question: "Puis-je prendre rendez-vous pour préparer mon voyage ?",
      answer: "Oui. Vous pouvez contacter l’agence afin de convenir d’un rendez-vous et préparer votre demande : destination ou envies, dates, nombre de voyageurs, budget et contraintes particulières.",
    },
  ],
  services: [
    {
      question: "Pouvez-vous réserver uniquement des billets d’avion ?",
      answer: "Oui. La billetterie aérienne fait partie des services proposés par l’agence. Votre conseiller peut étudier les vols disponibles et vous présenter les conditions tarifaires applicables avant réservation.",
    },
    {
      question: "Proposez-vous des voyages sur mesure au départ de Melun ?",
      answer: "Oui. Un projet sur mesure peut être étudié en fonction de vos dates, de votre budget, du rythme souhaité et des prestations disponibles auprès des partenaires référencés.",
    },
    {
      question: "L’agence de Melun peut-elle organiser une croisière ?",
      answer: "Oui. L’agence peut vous accompagner dans la recherche d’une croisière et comparer les solutions disponibles selon la destination, les dates, la compagnie, la cabine et les prestations recherchées.",
    },
    {
      question: "Pouvez-vous organiser un voyage en groupe ?",
      answer: "Oui. Les demandes de groupes peuvent être étudiées en agence pour des familles, amis, associations, clubs ou organisations, avec une proposition adaptée à la composition du groupe et au projet.",
    },
    {
      question: "Le paiement en plusieurs fois est-il possible ?",
      answer: "Des solutions de paiement en plusieurs fois peuvent être proposées selon le dossier, le produit réservé et les conditions du partenaire concerné. L’agence vous présente les modalités disponibles avant engagement.",
    },
  ],
  contact: [
    {
      question: "Comment demander un devis voyage à votre agence de Melun ?",
      answer: "Vous pouvez utiliser le formulaire de demande de devis du mini-site ou contacter directement l’agence. Plus votre demande précise la destination ou le type de voyage, les dates, le nombre de voyageurs et le budget, plus le premier échange sera efficace.",
    },
    {
      question: "Quelles informations préparer avant de contacter l’agence ?",
      answer: "Préparez si possible vos dates ou votre période de départ, le nombre et l’âge des voyageurs, votre budget indicatif, vos préférences de transport et d’hébergement ainsi que les contraintes importantes de votre projet.",
    },
    {
      question: "Comment contacter l’agence TUI STORE Melun ?",
      answer: "Vous pouvez joindre l’agence au 01 64 39 31 07, écrire à agencemelun@tuifrance.com ou vous rendre au 10 Rue Saint Etienne, 77000 Melun.",
    },
    {
      question: "La demande de devis engage-t-elle immédiatement une réservation ?",
      answer: "Non. La demande sert à présenter votre projet à l’agence. Les disponibilités, prestations, prix et conditions applicables doivent ensuite être confirmés avant toute réservation.",
    },
  ],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function faqKey(content) {
  for (const key of ["items", "questions", "faqs"]) {
    if (Array.isArray(content?.[key])) return key;
  }
  return "items";
}

function faqBlocksForPage(page) {
  return (page?.blocks || []).filter((block) => String(block.blockType || "").toLowerCase().includes("faq"));
}

function pageForPatch(site, patchSlug) {
  if (!Object.prototype.hasOwnProperty.call(PAGE_DB_SLUGS, patchSlug)) {
    throw new Error(`${CONTRACT}: clé page FAQ inconnue: ${patchSlug}`);
  }
  const dbSlug = PAGE_DB_SLUGS[patchSlug];
  return (site?.pages || []).find((entry) => String(entry.slug ?? "") === dbSlug) || null;
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

  const legalProfile = await prisma.legalProfile.findUnique({
    where: { tenantId_agencyId: { tenantId: tenant.id, agencyId: EXPECTED_AGENCY_ID } },
  });

  return { tenant, site, legalProfile };
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

function targetFaqBlockIds(site) {
  const ids = new Set();
  for (const patchSlug of Object.keys(FAQ_PATCHES)) {
    const page = pageForPatch(site, patchSlug);
    for (const block of faqBlocksForPage(page)) ids.add(block.id);
  }
  return ids;
}

function protectedFingerprint(state) {
  const faqIds = targetFaqBlockIds(state.site);
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
    legalProfile: state.legalProfile,
    pages: (state.site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      title: page.title,
      menuTitle: page.menuTitle,
      menuLocation: page.menuLocation,
      displayOrder: page.displayOrder,
      seoTitle: page.seoTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      schemaType: page.schemaType,
      status: page.status,
      published: page.published,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        blockType: block.blockType,
        name: block.name,
        content: faqIds.has(block.id) ? "__TARGET_FAQ_CONTENT__" : block.content,
        settings: block.settings,
        seo: block.seo,
        displayOrder: block.displayOrder,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: faqIds.has(block.id) ? "__TARGET_FAQ_VERSION__" : block.version,
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
  if (normalize(site.agency?.address) !== normalize(EXPECTED_ADDRESS)) throw new Error(`${CONTRACT}: adresse inattendue: ${site.agency?.address}`);
  if (String(site.agency?.postalCode || "") !== EXPECTED_POSTAL_CODE) throw new Error(`${CONTRACT}: code postal inattendu: ${site.agency?.postalCode}`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);
  if (!legalProfile || legalProfile.id !== EXPECTED_LEGAL_PROFILE_ID) throw new Error(`${CONTRACT}: profil juridique Melun inattendu`);

  const legalStrings = allStrings(legalProfile);
  if (legalStrings.some((value) => value.includes("Ambassade FRAM - Mondescale Maurepas"))) {
    throw new Error(`${CONTRACT}: résidu juridique Maurepas/FRAM encore présent`);
  }

  for (const patchSlug of Object.keys(FAQ_PATCHES)) {
    const page = pageForPatch(site, patchSlug);
    if (!page || page.status !== "published" || page.published !== true) {
      throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${patchSlug}`);
    }
    const faqBlocks = faqBlocksForPage(page);
    if (faqBlocks.length !== 1) {
      throw new Error(`${CONTRACT}: exactement un bloc FAQ attendu sur ${patchSlug}, trouvé: ${faqBlocks.length}`);
    }
  }

  const publicStrings = allStrings({
    name: site.name,
    agency: site.agency,
    pages: site.pages,
  });
  const futureBrandHits = [];
  for (const needle of FORBIDDEN_PUBLIC_BRANDS) {
    for (const value of publicStrings) {
      if (value.includes(needle)) futureBrandHits.push({ needle, value });
    }
  }
  if (futureBrandHits.length) {
    throw new Error(`${CONTRACT}: branding futur FRAM détecté avant migration: ${futureBrandHits[0].needle}`);
  }
}

function buildPlan(state) {
  return Object.entries(FAQ_PATCHES).map(([patchSlug, items]) => {
    const page = pageForPatch(state.site, patchSlug);
    const block = faqBlocksForPage(page)[0];
    const key = faqKey(block.content || {});
    const beforeItems = Array.isArray(block.content?.[key]) ? clone(block.content[key]) : [];
    return {
      pageId: page.id,
      pageSlug: patchSlug,
      dbPageSlug: PAGE_DB_SLUGS[patchSlug],
      blockId: block.id,
      blockType: block.blockType,
      faqKey: key,
      before: { items: beforeItems, version: block.version },
      after: { items: clone(items) },
    };
  });
}

async function restore(snapshot) {
  await prisma.$transaction(async (tx) => {
    for (const entry of snapshot.blocks || []) {
      await tx.pageBlock.update({
        where: { id: entry.id },
        data: { content: entry.content, version: entry.version },
      });
    }
  });
}

async function main() {
  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    if (
      snapshot.contract !== CONTRACT ||
      snapshot.target !== TARGET_SITE_SLUG ||
      snapshot.agencyId !== EXPECTED_AGENCY_ID
    ) {
      throw new Error(`${CONTRACT}: snapshot non conforme à la cible Melun`);
    }
    await restore(snapshot);
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "ROLLBACK",
      target: TARGET_SITE_SLUG,
      restored: true,
      snapshot: SNAPSHOT_PATH,
    }, null, 2));
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
      legalProfileId: before.legalProfile.id,
      faqBlockWrites: plan.length,
      faqItemsAfter: plan.reduce((sum, entry) => sum + entry.after.items.length, 0),
      localArea: LOCAL_AREA,
      geoReference: GEO_REFERENCE,
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
    blocks: plan.map((entry) => {
      const block = before.site.pages
        .flatMap((page) => page.blocks || [])
        .find((candidate) => candidate.id === entry.blockId);
      return { id: block.id, content: clone(block.content), version: block.version };
    }),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  await prisma.$transaction(async (tx) => {
    for (const entry of plan) {
      const block = before.site.pages
        .flatMap((page) => page.blocks || [])
        .find((candidate) => candidate.id === entry.blockId);
      const content = clone(block.content || {});
      content[entry.faqKey] = clone(entry.after.items);
      await tx.pageBlock.update({
        where: { id: block.id },
        data: { content, version: Number(block.version || 0) + 1 },
      });
    }
  });

  const after = await loadState();
  try {
    assertPreconditions(after);
    if (topologyFingerprint(after.site) !== beforeTopology) throw new Error(`${CONTRACT}: topologie modifiée`);
    if (protectedFingerprint(after) !== beforeProtected) throw new Error(`${CONTRACT}: champ protégé modifié`);

    const afterPlan = buildPlan(after);
    for (const entry of afterPlan) {
      const expected = FAQ_PATCHES[entry.pageSlug];
      if (JSON.stringify(entry.before.items) !== JSON.stringify(expected)) {
        throw new Error(`${CONTRACT}: FAQ inattendue après APPLY: ${entry.pageSlug}`);
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
    legalProfileId: after.legalProfile.id,
    faqBlockWrites: plan.length,
    faqItemsAfter: Object.values(FAQ_PATCHES).reduce((sum, items) => sum + items.length, 0),
    localArea: LOCAL_AREA,
    geoReference: GEO_REFERENCE,
    mutationPerformed: true,
    snapshot: SNAPSHOT_PATH,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());