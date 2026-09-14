"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONTRACT = "MSE-25.221";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_SLUG = "tui-store-melun";
const EXPECTED_AGENCY_ID = 8;
const EXPECTED_CITY = "Melun";
const EXPECTED_POSTAL_CODE = "77000";
const APPLY = String(process.env.MSE_25_221_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_221_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_221_SNAPSHOT || "/var/tmp/mse-25-221-melun-service-intent-authority-v1.snapshot.json";

const FORBIDDEN_PUBLIC_BRANDS = [
  "Ambassade FRAM",
  "Mondescale Ambassade FRAM",
  "ambassade-fram-mondescale-melun",
];

const REQUIRED_220_BLOCKS = Object.freeze([
  "mse25220melunagencyfaq",
  "mse25220melunservicesfaq",
  "mse25220melundestinationsfaq",
  "mse25220meluncontactfaq",
]);

const SERVICE_BLOCKS = Object.freeze([
  {
    id: "mse25221melunserviceair",
    name: "MSE-25.221 — Billetterie et vols",
    title: "Billetterie et vols : comparer au-delà du tarif affiché",
    html:
      '<p>Pour un billet d’avion, le prix n’est qu’un critère parmi d’autres. Les horaires, le nombre d’escales, la durée totale du trajet, les bagages inclus, les conditions de modification ou d’annulation et les services associés peuvent faire varier fortement l’intérêt d’une proposition.</p>' +
      '<p>L’agence de Melun peut vous aider à comparer ces éléments avant de retenir une solution. Si votre voyage comprend aussi un hébergement, un circuit ou d’autres prestations, il est utile de regarder l’ensemble du projet plutôt qu’un vol isolé. <a href="/agence/tui-store-melun/contact">Présentez votre demande à l’agence</a> avec vos dates et vos priorités.</p>',
  },
  {
    id: "mse25221melunserviceformats",
    name: "MSE-25.221 — Circuits clubs croisières",
    title: "Circuit, autotour, club ou croisière : choisir le bon format de voyage",
    html:
      '<p>Un circuit accompagné privilégie l’encadrement et un itinéraire organisé. Un autotour laisse davantage d’autonomie. Un séjour en club ou en formule tout compris concentre les prestations dans un même lieu, tandis qu’une croisière permet d’enchaîner plusieurs escales sans changer d’hébergement chaque nuit.</p>' +
      '<p>Le bon choix dépend du rythme souhaité, du niveau d’accompagnement, de la composition des voyageurs, de la durée disponible et du budget. Consultez aussi les <a href="/agence/tui-store-melun/destinations">destinations proposées</a> pour confronter le format de voyage aux contraintes concrètes de votre projet.</p>',
  },
  {
    id: "mse25221melunserviceprofiles",
    name: "MSE-25.221 — Voyages selon le profil",
    title: "Sur mesure, famille, voyage de noces ou groupe : partir de vos contraintes réelles",
    html:
      '<p>Un voyage sur mesure, des vacances en famille, un voyage de noces ou un départ en groupe ne se construisent pas avec les mêmes priorités. Âge des voyageurs, chambres, rythme, transferts, pension, besoins particuliers, budget et niveau de flexibilité peuvent orienter vers des solutions très différentes.</p>' +
      '<p>L’agence peut aussi intégrer l’hébergement à la réflexion lorsque votre besoin porte principalement sur un hôtel ou lorsqu’il complète un autre service. L’objectif est de construire une proposition cohérente avec les critères que vous avez réellement définis, sans présumer d’une formule unique adaptée à tous.</p>',
  },
  {
    id: "mse25221melunservicecompare",
    name: "MSE-25.221 — Méthode de comparaison",
    title: "Comment comparer deux propositions de voyage ?",
    html:
      '<p>Pour comparer deux offres, vérifiez ce qui est réellement inclus : transport, bagages, transferts, pension, catégorie de chambre, excursions, assurances éventuelles et conditions tarifaires. Une différence de prix peut correspondre à un niveau de prestation ou à des règles de réservation différents.</p>' +
      '<p>Apportez vos priorités dans l’ordre qui compte pour vous : budget maximal, vol direct, rythme, confort, localisation ou flexibilité. Cette hiérarchie aide à départager les propositions plus efficacement. Vous pouvez ensuite <a href="/agence/tui-store-melun/contact">contacter l’agence de Melun</a> ou demander un devis pour approfondir la solution retenue.</p>',
  },
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
  const servicePage = pageBySlug(site, "services");
  return hash({
    site: {
      id: site.id,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
      agencyId: site.agencyId,
    },
    services: servicePage ? {
      id: servicePage.id,
      slug: servicePage.slug,
      status: servicePage.status,
      published: servicePage.published,
      blocks: (servicePage.blocks || []).map((block) => ({
        id: block.id,
        blockType: block.blockType,
        name: block.name,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        displayOrder: block.displayOrder,
      })),
    } : null,
    predecessor220: (site.pages || []).flatMap((page) => page.blocks || [])
      .filter((block) => REQUIRED_220_BLOCKS.includes(block.id))
      .map((block) => block.id)
      .sort(),
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

  const services = pageBySlug(site, "services");
  if (!services || services.status !== "published" || services.published !== true) {
    throw new Error(`${CONTRACT}: page services absente ou non publiée`);
  }

  const existingIds = new Set((site.pages || []).flatMap((page) => (page.blocks || []).map((block) => block.id)));
  for (const requiredId of REQUIRED_220_BLOCKS) {
    if (!existingIds.has(requiredId)) throw new Error(`${CONTRACT}: prédécesseur #220 absent: ${requiredId}`);
  }

  const targetIds = new Set(SERVICE_BLOCKS.map((entry) => entry.id));
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
  const page = pageBySlug(state.site, "services");
  const currentOrders = (page.blocks || []).map((block) => Number(block.displayOrder)).filter(Number.isFinite);
  const baseOrder = currentOrders.length ? Math.max(...currentOrders) : 0;
  return SERVICE_BLOCKS.map((entry, index) => ({
    slug: "services",
    pageId: page.id,
    displayOrder: baseOrder + ((index + 1) * 10),
    blockType: "rich_text",
    ...entry,
    content: {
      title: entry.title,
      html: entry.html,
      alignment: "left",
      editorialKey: `mse-25.221-services-${index + 1}`,
    },
  }));
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
  const fingerprint = guardFingerprint(before.site);
  const plan = buildPlan(before);

  if (!APPLY) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      guardFingerprint: fingerprint,
      predecessor220Blocks: REQUIRED_220_BLOCKS.length,
      blockCreates: plan.length,
      serviceIntentClusters: SERVICE_BLOCKS.length,
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
  if (guardFingerprint(justBefore.site) !== fingerprint) {
    throw new Error(`${CONTRACT}: état Melun modifié entre précontrôle et APPLY`);
  }

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    guardFingerprint: fingerprint,
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
    const page = pageBySlug(after.site, "services");
    for (const entry of plan) {
      const block = (page.blocks || []).find((candidate) => candidate.id === entry.id);
      if (!block) throw new Error(`${CONTRACT}: bloc créé absent: ${entry.id}`);
      if (block.blockType !== "rich_text" || block.status !== "published") throw new Error(`${CONTRACT}: état bloc invalide: ${entry.id}`);
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
    originalGuardFingerprint: fingerprint,
    blockCreates: plan.length,
    serviceIntentClusters: SERVICE_BLOCKS.length,
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
