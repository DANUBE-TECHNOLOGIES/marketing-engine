"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CONTRACT = "MSE-25.226";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const TARGET_SITE_ID = "cms8n89kc0001n91a7c5eiz9w";
const TARGET_SITE_SLUG = "ambassade-fram-mondescale-maurepas";
const EXPECTED_AGENCY_ID = 1;
const TARGET_PAGE_SLUG = "services";
const TARGET_BLOCK_ID = "mse25225maurepasserviceformats";
const APPLY = String(process.env.MSE_25_226_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_226_ROLLBACK || "").toLowerCase() === "true";
const SNAPSHOT_PATH = process.env.MSE_25_226_SNAPSHOT || "/var/tmp/mse-25-226-maurepas-service-formats-grounding-fix-v1.snapshot.json";

const EXPECTED_OLD_TITLE = "Du séjour au voyage itinérant : choisir le format adapté à votre projet";
const EXPECTED_OLD_MARKERS = ["club", "all inclusive", "circuit accompagné", "autotour", "réservation d’hôtel"];
const FORBIDDEN_MELUN_MARKERS = ["tui-store-melun", "10 rue Saint-Étienne", "77000 Melun", "01 64 39 31 07", "agencemelun@tuifrance.com"];

const NEW_TITLE = "Séjour, circuit, sur mesure ou croisière : partir de votre projet";
const NEW_HTML = '<p>À Maurepas, un projet peut commencer par un séjour ou un circuit, évoluer vers un voyage sur mesure, une croisière, un voyage de noces ou un départ en groupe. La billetterie permet aussi de traiter un besoin centré sur le transport aérien.</p><p>L’équipe part de vos dates, de votre budget, du nombre de voyageurs et de vos priorités pour comparer les solutions correspondant réellement à votre demande. Vous pouvez consulter nos <a href="/agence/ambassade-fram-mondescale-maurepas/destinations">destinations</a> ou <a href="/agence/ambassade-fram-mondescale-maurepas/contact">présenter votre projet à l’agence</a>.</p>';

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

async function loadState() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`${CONTRACT}: tenant introuvable: ${TENANT_SLUG}`);

  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: {
        where: { slug: TARGET_PAGE_SLUG },
        include: { blocks: { where: { id: TARGET_BLOCK_ID } } },
      },
    },
  });

  return { tenant, site };
}

function assertIdentity(state) {
  const { tenant, site } = state;
  if (!site) throw new Error(`${CONTRACT}: site cible introuvable`);
  if (tenant.id !== "tenant_mondescale") throw new Error(`${CONTRACT}: tenant inattendu: ${tenant.id}`);
  if (site.id !== TARGET_SITE_ID) throw new Error(`${CONTRACT}: siteId inattendu: ${site.id}`);
  if (Number(site.agencyId) !== EXPECTED_AGENCY_ID) throw new Error(`${CONTRACT}: agencyId inattendu: ${site.agencyId}`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`${CONTRACT}: slug inattendu: ${site.slug}`);
  if (site.basePath !== `/agence/${TARGET_SITE_SLUG}`) throw new Error(`${CONTRACT}: basePath inattendu: ${site.basePath}`);

  const identityText = JSON.stringify({ site: site.slug, agency: site.agency });
  for (const marker of FORBIDDEN_MELUN_MARKERS) {
    if (identityText.includes(marker)) throw new Error(`${CONTRACT}: contamination Melun détectée: ${marker}`);
  }
}

function getTarget(state) {
  const page = state.site?.pages?.[0];
  if (!page || page.slug !== TARGET_PAGE_SLUG || page.status !== "published" || page.published !== true) {
    throw new Error(`${CONTRACT}: page services absente ou non publiée`);
  }
  const block = page.blocks?.[0];
  if (!block || block.id !== TARGET_BLOCK_ID) throw new Error(`${CONTRACT}: bloc cible absent`);
  if (block.blockType !== "rich_text" || block.status !== "published") throw new Error(`${CONTRACT}: bloc cible dans un état inattendu`);
  return { page, block };
}

function assertOldVersion(block) {
  const title = String(block.content?.title || "");
  const html = String(block.content?.html || "");
  if (title !== EXPECTED_OLD_TITLE) throw new Error(`${CONTRACT}: titre source inattendu; correction refusée`);
  for (const marker of EXPECTED_OLD_MARKERS) {
    if (!html.toLowerCase().includes(marker.toLowerCase())) throw new Error(`${CONTRACT}: contenu source inattendu; marqueur absent: ${marker}`);
  }
}

function fingerprint(state, page, block) {
  return hash({
    site: { id: state.site.id, slug: state.site.slug, agencyId: state.site.agencyId },
    page: { id: page.id, slug: page.slug, status: page.status, published: page.published },
    block: {
      id: block.id,
      pageId: block.pageId,
      blockType: block.blockType,
      name: block.name,
      content: block.content,
      settings: block.settings,
      seo: block.seo,
      displayOrder: block.displayOrder,
      status: block.status,
      visibleDesktop: block.visibleDesktop,
      visibleMobile: block.visibleMobile,
      version: block.version,
    },
  });
}

function buildNextContent(block) {
  return {
    ...(block.content || {}),
    title: NEW_TITLE,
    html: NEW_HTML,
    alignment: block.content?.alignment || "left",
    editorialKey: block.content?.editorialKey || "mse-25.225-services-2",
  };
}

async function rollback() {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`${CONTRACT}: snapshot absent: ${SNAPSHOT_PATH}`);
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot.contract !== CONTRACT || snapshot.target !== TARGET_SITE_SLUG || snapshot.blockId !== TARGET_BLOCK_ID) {
    throw new Error(`${CONTRACT}: snapshot non conforme`);
  }

  const state = await loadState();
  assertIdentity(state);
  const { block } = getTarget(state);
  if (String(block.content?.title || "") !== NEW_TITLE) throw new Error(`${CONTRACT}: version corrigée absente; rollback refusé`);

  await prisma.pageBlock.update({
    where: { id: TARGET_BLOCK_ID },
    data: {
      name: snapshot.before.name,
      content: snapshot.before.content,
      settings: snapshot.before.settings,
      seo: snapshot.before.seo,
      displayOrder: snapshot.before.displayOrder,
      status: snapshot.before.status,
      visibleDesktop: snapshot.before.visibleDesktop,
      visibleMobile: snapshot.before.visibleMobile,
      version: snapshot.before.version,
    },
  });

  console.log(JSON.stringify({ contract: CONTRACT, mode: "ROLLBACK", restored: true, mutationPerformed: true, snapshot: SNAPSHOT_PATH }, null, 2));
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error(`${CONTRACT}: APPLY et ROLLBACK exclusifs`);
  if (ROLLBACK) return rollback();

  const before = await loadState();
  assertIdentity(before);
  const { page, block } = getTarget(before);
  assertOldVersion(block);
  const guardFingerprint = fingerprint(before, page, block);
  const nextContent = buildNextContent(block);

  const plan = {
    pageSlug: TARGET_PAGE_SLUG,
    pageId: page.id,
    blockId: block.id,
    oldTitle: block.content?.title,
    newTitle: NEW_TITLE,
    newHtml: NEW_HTML,
  };

  if (!APPLY) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      mode: "DRY_RUN",
      target: TARGET_SITE_SLUG,
      agencyId: before.site.agencyId,
      guardFingerprint,
      blockUpdates: 1,
      targetPages: 1,
      routeWrites: 0,
      agencyWrites: 0,
      pageSeoWrites: 0,
      plan,
      mutationPerformed: false,
    }, null, 2));
    return;
  }

  const justBefore = await loadState();
  assertIdentity(justBefore);
  const current = getTarget(justBefore);
  assertOldVersion(current.block);
  if (fingerprint(justBefore, current.page, current.block) !== guardFingerprint) {
    throw new Error(`${CONTRACT}: état Maurepas modifié entre précontrôle et APPLY`);
  }

  const snapshot = {
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    target: TARGET_SITE_SLUG,
    agencyId: EXPECTED_AGENCY_ID,
    blockId: TARGET_BLOCK_ID,
    guardFingerprint,
    before: {
      name: current.block.name,
      content: current.block.content,
      settings: current.block.settings,
      seo: current.block.seo,
      displayOrder: current.block.displayOrder,
      status: current.block.status,
      visibleDesktop: current.block.visibleDesktop,
      visibleMobile: current.block.visibleMobile,
      version: current.block.version,
    },
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

  await prisma.$transaction(async (tx) => {
    await tx.pageBlock.update({
      where: { id: TARGET_BLOCK_ID },
      data: { content: nextContent, version: { increment: 1 } },
    });
  });

  const after = await loadState();
  assertIdentity(after);
  const updated = getTarget(after).block;
  if (updated.content?.title !== NEW_TITLE || updated.content?.html !== NEW_HTML) {
    throw new Error(`${CONTRACT}: validation post-APPLY échouée`);
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    mode: "APPLY",
    target: TARGET_SITE_SLUG,
    agencyId: after.site.agencyId,
    originalGuardFingerprint: guardFingerprint,
    blockUpdates: 1,
    targetPages: 1,
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
