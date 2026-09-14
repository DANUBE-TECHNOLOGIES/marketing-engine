"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.219";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const APPLY = String(process.env.MSE_25_219_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_219_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_219_SNAPSHOT || "/var/tmp/mse-25-219-melun-conversion-reassurance-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const REQUIRED_217_BLOCKS = Object.freeze([
  "mse25217melunagency",
  "mse25217melundestinations",
  "mse25217meluninspirations",
  "mse25217melunreviews",
  "mse25217meluncontact",
]);

const BLOCKS = Object.freeze({
  agence: {
    id: "mse25219melunagencyappointment",
    blockType: "appointment",
    name: "MSE-25.219 — Conversion agence",
    content: {
      eyebrow: "Votre projet",
      title: "Parlez de votre voyage avec un conseiller à Melun",
      text: "Expliquez vos dates, votre budget et vos priorités : l’agence vous aide à comparer les solutions pertinentes avant de choisir.",
      primaryButton: "Parler de mon projet",
      editorialKey: "mse-25.219-agence-appointment",
    },
  },
  services: {
    id: "mse25219melunservicesappointment",
    blockType: "appointment",
    name: "MSE-25.219 — Conversion services",
    content: {
      eyebrow: "Besoin d’un conseil ?",
      title: "Choisissez le bon service pour votre projet",
      text: "Billetterie, séjour, circuit, croisière ou sur mesure : un conseiller peut vous aider à comparer les prestations et les conditions disponibles.",
      primaryButton: "Échanger avec l’agence",
      editorialKey: "mse-25.219-services-appointment",
    },
  },
  destinations: {
    id: "mse25219melundestinationsappointment",
    blockType: "appointment",
    name: "MSE-25.219 — Conversion destinations",
    content: {
      eyebrow: "Passer au concret",
      title: "Une destination vous attire ? Vérifions si elle correspond à votre projet",
      text: "Période, durée, budget, rythme et aéroport de départ peuvent changer les meilleures options. Présentez votre projet à l’agence de Melun.",
      primaryButton: "Étudier mon projet",
      editorialKey: "mse-25.219-destinations-appointment",
    },
  },
  avis: {
    id: "mse25219melunreviewsappointment",
    blockType: "appointment",
    name: "MSE-25.219 — Conversion avis",
    content: {
      eyebrow: "À votre tour",
      title: "Vous souhaitez vérifier si l’agence peut répondre à votre besoin ?",
      text: "Présentez simplement votre projet, même s’il n’est pas encore finalisé. Un échange permet de préciser les options à comparer.",
      primaryButton: "Contacter l’agence",
      editorialKey: "mse-25.219-reviews-appointment",
    },
  },
  contact: {
    id: "mse25219meluncontactcta",
    blockType: "cta",
    name: "MSE-25.219 — Devis et appel",
    content: {
      title: "Prêt à avancer sur votre voyage ?",
      text: "Vous pouvez demander un devis en ligne ou appeler directement l’agence de Melun au 01 64 39 31 07.",
      primaryCta: { label: "Demander un devis" },
      secondaryCta: { label: "Appeler l’agence", href: "tel:+33164393107" },
      editorialKey: "mse-25.219-contact-cta",
    },
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

function guardFingerprint(site) {
  const targets = new Set([...Object.keys(BLOCKS), "inspirations"]);
  return hash({
    site: {
      id: site.id,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
      agencyId: site.agencyId,
    },
    pages: (site.pages || [])
      .filter((page) => targets.has(String(page.slug || "")))
      .map((page) => ({
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

  for (const slug of Object.keys(BLOCKS)) {
    const page = pageBySlug(site, slug);
    if (!page || page.status !== "published" || page.published !== true) {
      throw new Error(`${CONTRACT}: page cible absente ou non publiée: ${slug}`);
    }
  }

  const existingIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  for (const requiredId of REQUIRED_217_BLOCKS) {
    if (!existingIds.has(requiredId)) throw new Error(`${CONTRACT}: prédécesseur #217 absent: ${requiredId}`);
  }

  const targetIds = new Set(Object.values(BLOCKS).map((entry) => entry.id));
  const existingTargets = [...existingIds].filter((id) => targetIds.has(id));
  if (!allowCreatedBlocks && existingTargets.length) {
    throw new Error(`${CONTRACT}: un bloc cible existe déjà; APPLY refusé: ${existingTargets.join(", ")}`);
  }

  const publicStrings = allStrings({ name: site.name, agency: site.agency, pages: site.pages });
  for (const forbidden of FORBIDDEN_PUBLIC_BRANDS) {
    if (publicStrings.some((value) => value.includes(forbidden))) {
      throw new Error(`${CONTRACT}: branding futur détecté avant le 01/10: ${forbidden}`);
    }
  }
}

function buildPlan(state) {
  return Object.entries(BLOCKS).map(([slug, block]) => {
    const page = pageBySlug(state.site, slug);
    const orders = (page.blocks || []).map((item) => Number(item.displayOrder)).filter(Number.isFinite);
    const displayOrder = (orders.length ? Math.max(...orders) : 0) + 10;
    return { slug, pageId: page.id, displayOrder, ...block };
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
    if (guardFingerprint(restored.site) !== snapshot.guardFingerprint) {
      throw new Error(`${CONTRACT}: état protégé non restauré après rollback`);
    }
    console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", restored: true, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const before = await loadState();
  assertPreconditions(before);
  const beforeFingerprint = guardFingerprint(before.site);
  const plan = buildPlan(before);

  if (!APPLY) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      guardFingerprint: beforeFingerprint,
      predecessor217Blocks: REQUIRED_217_BLOCKS.length,
      blockCreates: plan.length,
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
  if (guardFingerprint(justBefore.site) !== beforeFingerprint) {
    throw new Error(`${CONTRACT}: état Melun modifié entre précontrôle et APPLY`);
  }

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    guardFingerprint: beforeFingerprint,
    createdBlockIds: plan.map((entry) => entry.id),
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

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
  try {
    assertPreconditions(after, { allowCreatedBlocks: true });
    for (const entry of plan) {
      const page = pageBySlug(after.site, entry.slug);
      const block = (page.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block) throw new Error(`${CONTRACT}: bloc créé absent: ${entry.id}`);
      if (block.blockType !== entry.blockType || block.status !== "published") throw new Error(`${CONTRACT}: état bloc invalide: ${entry.id}`);
      if (JSON.stringify(stable(block.content)) !== JSON.stringify(stable(entry.content))) throw new Error(`${CONTRACT}: contenu bloc invalide: ${entry.id}`);
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
    originalGuardFingerprint: beforeFingerprint,
    blockCreates: plan.length,
    routeWrites: 0,
    agencyWrites: 0,
    pageSeoWrites: 0,
    mutationPerformed: true,
    snapshot: SNAPSHOT_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ contract: CONTRACT, error: error.message }, null, 2));
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
