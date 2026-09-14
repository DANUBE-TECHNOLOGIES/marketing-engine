"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const CONTRACT = "MSE-25.220";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const APPLY = String(process.env.MSE_25_220_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_220_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_220_SNAPSHOT || "/var/tmp/mse-25-220-melun-local-intent-faq-v1.snapshot.json";

const REQUIRED_219_BLOCKS = Object.freeze([
  "mse25219melunagencyappointment",
  "mse25219melunservicesappointment",
  "mse25219melundestinationsappointment",
  "mse25219melunreviewsappointment",
  "mse25219meluncontactcta",
]);

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const BLOCKS = Object.freeze({
  agence: {
    id: "mse25220melunagencyfaq",
    name: "MSE-25.220 — FAQ agence locale",
    content: {
      title: "Questions fréquentes sur votre agence de voyages à Melun",
      introduction: "Quelques repères pratiques avant de venir en agence ou de nous contacter.",
      items: [
        { question: "Puis-je venir en agence à Melun pour préparer mon voyage ?", answer: "Oui. L’agence est située au 10 Rue Saint Etienne à Melun. Vous pouvez y présenter votre projet, vos dates, votre budget et vos priorités afin d’échanger avec un conseiller." },
        { question: "Faut-il déjà avoir choisi sa destination avant de contacter l’agence ?", answer: "Non. Vous pouvez partir de vos envies, de votre période de départ, de la durée disponible et de votre budget. Ces éléments permettent déjà de comparer plusieurs pistes de voyage." },
        { question: "Quels types de voyages peut-on préparer avec l’agence de Melun ?", answer: "L’agence accompagne notamment les projets de séjour, circuit, croisière, billetterie aérienne et voyage sur mesure, selon les solutions réellement disponibles auprès des partenaires référencés." },
      ],
      editorialKey: "mse-25.220-agence-faq",
    },
  },
  services: {
    id: "mse25220melunservicesfaq",
    name: "MSE-25.220 — FAQ services voyage",
    content: {
      title: "Questions fréquentes sur les services voyage à Melun",
      introduction: "Les réponses ci-dessous vous aident à identifier le service le plus adapté à votre projet.",
      items: [
        { question: "L’agence de Melun peut-elle s’occuper uniquement de billets d’avion ?", answer: "Oui. La billetterie aérienne fait partie des services proposés. L’agence peut aussi étudier un séjour, un circuit, une croisière ou un projet sur mesure." },
        { question: "Peut-on comparer un circuit, un autotour, un séjour en club ou une croisière ?", answer: "Oui. Le choix peut être comparé selon votre durée de voyage, votre budget, le rythme souhaité, le niveau d’accompagnement et les prestations disponibles." },
        { question: "Les prestations et conditions sont-elles les mêmes pour tous les voyages ?", answer: "Non. Les prestations incluses, conditions et disponibilités dépendent de la solution retenue et du partenaire concerné. Elles doivent être vérifiées pour chaque proposition." },
      ],
      editorialKey: "mse-25.220-services-faq",
    },
  },
  destinations: {
    id: "mse25220melundestinationsfaq",
    name: "MSE-25.220 — FAQ choix destination",
    content: {
      title: "Questions fréquentes pour choisir une destination",
      introduction: "Une destination se choisit aussi selon les contraintes concrètes du voyage.",
      items: [
        { question: "Comment choisir une destination quand on hésite encore ?", answer: "Commencez par préciser la période, la durée, le budget, le type de voyage recherché et votre niveau de confort. Ces critères permettent de réduire les options et de comparer des destinations réellement compatibles avec votre projet." },
        { question: "Le choix de l’aéroport de départ peut-il influencer la destination ?", answer: "Oui. Les liaisons aériennes disponibles, les horaires et les conditions de transport peuvent modifier les solutions pertinentes pour une même période." },
        { question: "L’agence peut-elle tenir compte des formalités de voyage dans la comparaison ?", answer: "Oui. Les formalités applicables font partie des éléments à vérifier lorsque plusieurs destinations sont envisagées, avec les autres contraintes du séjour et les informations officielles utiles au moment du projet." },
      ],
      editorialKey: "mse-25.220-destinations-faq",
    },
  },
  contact: {
    id: "mse25220meluncontactfaq",
    name: "MSE-25.220 — FAQ préparation contact",
    content: {
      title: "Questions fréquentes avant de contacter l’agence",
      introduction: "Quelques informations suffisent pour démarrer l’étude de votre projet.",
      items: [
        { question: "Quelles informations préparer avant de contacter l’agence ?", answer: "Si possible, indiquez votre période de départ, la durée souhaitée, le nombre et l’âge des voyageurs, votre budget indicatif et vos principales priorités." },
        { question: "Puis-je demander un devis en ligne ?", answer: "Oui. La page de contact permet d’accéder à la demande de devis en ligne pour transmettre les premiers éléments de votre projet." },
        { question: "Puis-je appeler directement l’agence de Melun ?", answer: "Oui. Vous pouvez joindre l’agence au 01 64 39 31 07 pour présenter votre demande ou préparer la suite de votre projet." },
      ],
      editorialKey: "mse-25.220-contact-faq",
    },
  },
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stable(value[key]); return acc; }, {});
  }
  return value;
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function allStrings(value, acc = []) { if (typeof value === "string") acc.push(value); else if (Array.isArray(value)) value.forEach((item) => allStrings(item, acc)); else if (value && typeof value === "object") Object.values(value).forEach((item) => allStrings(item, acc)); return acc; }

async function loadState() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable`);
  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: { agency: true, pages: { orderBy: { displayOrder: "asc" }, include: { blocks: { orderBy: { displayOrder: "asc" } } } } },
  });
  return { tenant, site };
}
function pageBySlug(site, slug) { return (site?.pages || []).find((page) => String(page.slug || "") === slug) || null; }
function guardFingerprint(site) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, agencyId: site.agencyId, status: site.status },
    pages: (site.pages || []).filter((page) => Object.keys(BLOCKS).includes(String(page.slug || ""))).map((page) => ({
      id: page.id, slug: page.slug, status: page.status, published: page.published,
      blocks: (page.blocks || []).map((block) => ({ id: block.id, blockType: block.blockType, status: block.status, visibleDesktop: block.visibleDesktop, visibleMobile: block.visibleMobile, displayOrder: block.displayOrder })),
    })),
  });
}
function assertPreconditions({ tenant, site }, { allowCreatedBlocks = false } = {}) {
  if (!site) throw new Error(`${CONTRACT}: site introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID || normalize(site.agency?.city) !== "melun" || String(site.agency?.postalCode || "") !== "77000") throw new Error(`${CONTRACT}: agence cible inattendue`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu`);
  for (const slug of Object.keys(BLOCKS)) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) throw new Error(`${CONTRACT}: page cible non publiée: ${slug}`);
  }
  const allIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  for (const id of REQUIRED_219_BLOCKS) if (!allIds.has(id)) throw new Error(`${CONTRACT}: prédécesseur #219 absent: ${id}`);
  const targetIds = Object.values(BLOCKS).map((block) => block.id);
  const existing = targetIds.filter((id) => allIds.has(id));
  if (!allowCreatedBlocks && existing.length) throw new Error(`${CONTRACT}: bloc #220 déjà présent: ${existing.join(", ")}`);
  const strings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_PUBLIC_BRANDS) if (strings.some((value) => value.includes(forbidden))) throw new Error(`${CONTRACT}: branding futur détecté: ${forbidden}`);
}
function buildPlan(state) {
  return Object.entries(BLOCKS).map(([slug, block]) => {
    const page = pageBySlug(state.site, slug);
    const orders = (page.blocks || []).map((item) => Number(item.displayOrder)).filter(Number.isFinite);
    return { slug, pageId: page.id, displayOrder: (orders.length ? Math.max(...orders) : 0) + 10, ...block };
  });
}
async function rollback(snapshot) {
  const ids = Array.isArray(snapshot?.createdBlockIds) ? snapshot.createdBlockIds : [];
  if (!ids.length) throw new Error(`${CONTRACT}: snapshot sans blocs`);
  await prisma.pageBlock.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error(`${CONTRACT}: APPLY et ROLLBACK exclusifs`);
  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent`);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.agencyId !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: snapshot invalide`);
    await rollback(snapshot);
    const restored = await loadState();
    assertPreconditions(restored);
    if (guardFingerprint(restored.site) !== snapshot.guardFingerprint) throw new Error(`${CONTRACT}: état non restauré`);
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadState();
  assertPreconditions(before);
  const fingerprint = guardFingerprint(before.site);
  const plan = buildPlan(before);
  if (!APPLY) {
    console.log(JSON.stringify({ contract: CONTRACT, mode: "DRY_RUN", target: TARGET_SITE_SLUG, agencyId: before.site.agencyId, guardFingerprint: fingerprint, predecessor219Blocks: REQUIRED_219_BLOCKS.length, blockCreates: plan.length, faqItems: plan.reduce((sum, entry) => sum + entry.content.items.length, 0), routeWrites: 0, agencyWrites: 0, pageSeoWrites: 0, plan, mutationPerformed: false }, null, 2));
    return;
  }

  const justBefore = await loadState();
  assertPreconditions(justBefore);
  if (guardFingerprint(justBefore.site) !== fingerprint) throw new Error(`${CONTRACT}: état Melun modifié avant APPLY`);

  const snapshot = { contract: CONTRACT, createdAt: new Date().toISOString(), target: TARGET_SITE_SLUG, agencyId: EXPECTED_AGENCY_ID, guardFingerprint: fingerprint, createdBlockIds: plan.map((entry) => entry.id) };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

  await prisma.$transaction(async (tx) => {
    for (const entry of plan) {
      await tx.pageBlock.create({ data: { id: entry.id, pageId: entry.pageId, blockType: "faq", name: entry.name, content: entry.content, settings: {}, seo: {}, displayOrder: entry.displayOrder, status: "published", visibleDesktop: true, visibleMobile: true, version: 1 } });
    }
  });

  const after = await loadState();
  try {
    assertPreconditions(after, { allowCreatedBlocks: true });
    for (const entry of plan) {
      const block = (pageBySlug(after.site, entry.slug)?.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block || block.blockType !== "faq" || block.status !== "published") throw new Error(`${CONTRACT}: bloc invalide: ${entry.id}`);
      if (JSON.stringify(stable(block.content)) !== JSON.stringify(stable(entry.content))) throw new Error(`${CONTRACT}: contenu invalide: ${entry.id}`);
    }
  } catch (error) {
    await rollback(snapshot);
    throw new Error(`${error.message}; rollback automatique effectué`);
  }

  console.log(JSON.stringify({ contract: CONTRACT, mode: "APPLY", target: TARGET_SITE_SLUG, agencyId: after.site.agencyId, originalGuardFingerprint: fingerprint, blockCreates: plan.length, faqItems: plan.reduce((sum, entry) => sum + entry.content.items.length, 0), routeWrites: 0, agencyWrites: 0, pageSeoWrites: 0, mutationPerformed: true, snapshot: SNAPSHOT_PATH }, null, 2));
}

main().catch((error) => { console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2)); process.exitCode = 1; }).finally(() => prisma.$disconnect());
