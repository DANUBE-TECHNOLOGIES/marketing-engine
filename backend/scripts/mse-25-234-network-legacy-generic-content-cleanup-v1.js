const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONTRACT = 'MSE-25.234';
const CONFIRM_ENV = 'MSE_25_234_CONFIRM';
const SNAPSHOT_ENV = 'MSE_25_234_SNAPSHOT';
const DEFAULT_SNAPSHOT = '/app/runtime-snapshots/mse-25-234-network-legacy-generic-content-cleanup-v1.snapshot.json';

const TARGETS = [
  {
    siteId: 'cms8n8cqz007pn91a2oipxuul',
    slug: 'ambassade-fram-mondescale-dax',
    agencyId: 3,
    blocks: [
      { id: 'cmsw1f4j800lfp11ad71g6mzd', pageSlug: 'destinations', type: 'faq', marker: 'Pourquoi passer par une agence pour destinations ?' }
    ]
  },
  {
    siteId: 'cms8n89kc0001n91a7c5eiz9w',
    slug: 'ambassade-fram-mondescale-maurepas',
    agencyId: 1,
    blocks: [
      { id: 'cmsztn31x009rtdhd5zvuyrpy', pageSlug: 'home', type: 'faq', marker: 'Pourquoi passer par une agence pour accueil ?' }
    ]
  },
  {
    siteId: 'cms8n8pu600qvn91a6bo0gx6v',
    slug: 'tui-store-amilly',
    agencyId: 9,
    blocks: [
      { id: 'cmsw1f7oq011tp11ad8p64f2h', pageSlug: 'engagements', type: 'faq', marker: 'Pourquoi passer par une agence pour nos engagements ?' },
      { id: 'cmsw1f7xc0135p11apix07ure', pageSlug: 'destinations', type: 'faq', marker: 'Pourquoi passer par une agence pour destinations ?' }
    ]
  },
  {
    siteId: 'cms8n8or700n1n91a488phqrp',
    slug: 'tui-store-melun',
    agencyId: 8,
    blocks: [
      { id: 'cmsqctsqr006bmn5y5eaohpf0', pageSlug: '', type: 'team', marker: 'Votre équipe' },
      { id: 'cmtpzcp2g0004q9b17ud9f8fh', pageSlug: 'agence', type: 'team', marker: 'Votre équipe' },
      { id: 'cmtpzcp9k000cq9b1bi6s8jxn', pageSlug: 'equipe', type: 'team', marker: 'Votre équipe' },
      { id: 'cmsqctsr2006hmn5ylp2ep54z', pageSlug: '', type: 'faq', marker: 'Pourquoi passer par une agence pour accueil ?' },
      { id: 'cmtpzcpet000kq9b1h2d6yumo', pageSlug: 'engagements', type: 'faq', marker: 'Pourquoi passer par une agence pour nos engagements ?' },
      { id: 'cmtpzcpje000sq9b1qkayap3i', pageSlug: 'destinations', type: 'faq', marker: 'Pourquoi passer par une agence pour destinations ?' },
      { id: 'cmtpzcpq3001hq9b16bn9yewv', pageSlug: 'contact', type: 'faq', marker: 'Pourquoi passer par une agence pour contact ?' }
    ]
  }
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = canonicalize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function fingerprint(rows) {
  return crypto.createHash('sha256').update(canonicalJson(rows)).digest('hex');
}

function containsMarker(content, marker) {
  return JSON.stringify(content || {}).includes(marker);
}

async function readState(client) {
  const rows = [];

  for (const target of TARGETS) {
    const site = await client.agencySite.findUnique({
      where: { id: target.siteId },
      include: {
        agency: true,
        pages: { include: { blocks: true } }
      }
    });

    if (!site) throw new Error(`Target site ${target.siteId} not found`);
    if (site.slug !== target.slug) throw new Error(`Unexpected slug for ${target.siteId}: ${site.slug}`);
    if (site.agencyId !== target.agencyId) throw new Error(`Unexpected agencyId for ${target.slug}: ${site.agencyId}`);

    const pageByBlock = new Map();
    for (const page of site.pages) {
      for (const block of page.blocks) pageByBlock.set(block.id, page);
    }

    for (const expected of target.blocks) {
      const page = pageByBlock.get(expected.id);
      if (!page) throw new Error(`Block ${expected.id} not found on ${target.slug}`);
      const block = page.blocks.find(b => b.id === expected.id);

      if (page.slug !== expected.pageSlug) {
        throw new Error(`Block ${expected.id} page mismatch: expected '${expected.pageSlug}', got '${page.slug}'`);
      }
      if (block.blockType !== expected.type) {
        throw new Error(`Block ${expected.id} type mismatch: expected ${expected.type}, got ${block.blockType}`);
      }
      if (block.status !== 'published') {
        throw new Error(`Block ${expected.id} status mismatch: expected published, got ${block.status}`);
      }
      if (!containsMarker(block.content, expected.marker)) {
        throw new Error(`Block ${expected.id} marker missing: ${expected.marker}`);
      }

      rows.push({
        siteId: site.id,
        siteSlug: site.slug,
        agencyId: site.agencyId,
        pageId: page.id,
        pageSlug: page.slug,
        blockId: block.id,
        blockType: block.blockType,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        content: block.content
      });
    }
  }

  return rows;
}

async function main() {
  const apply = process.env[CONFIRM_ENV] === 'true';
  const snapshotPath = process.env[SNAPSHOT_ENV] || DEFAULT_SNAPSHOT;
  const rows = await readState(prisma);
  const originalGuardFingerprint = fingerprint(rows);
  const blockCount = TARGETS.reduce((sum, target) => sum + target.blocks.length, 0);

  const plan = TARGETS.flatMap(target => target.blocks.map(block => ({
    siteSlug: target.slug,
    agencyId: target.agencyId,
    pageSlug: block.pageSlug || '/',
    blockId: block.id,
    blockType: block.type,
    operation: 'HIDE_LEGACY_GENERIC_BLOCK'
  })));

  if (!apply) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      scope: 'NETWORK_LEGACY_GENERIC_CONTENT_CLEANUP',
      targetSites: TARGETS.length,
      blockUpdates: blockCount,
      routeWrites: 0,
      agencyWrites: 0,
      pageSeoWrites: 0,
      lamorlayeWrites: 0,
      mode: 'DRY_RUN',
      guardFingerprint: originalGuardFingerprint,
      plan,
      mutationPerformed: false
    }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify({
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    guardFingerprint: originalGuardFingerprint,
    blocks: rows
  }, null, 2));

  await prisma.$transaction(async tx => {
    const currentRows = await readState(tx);
    const currentFingerprint = fingerprint(currentRows);
    if (currentFingerprint !== originalGuardFingerprint) {
      throw new Error(`Concurrent change detected: ${currentFingerprint} != ${originalGuardFingerprint}`);
    }

    for (const target of TARGETS) {
      for (const block of target.blocks) {
        await tx.pageBlock.update({
          where: { id: block.id },
          data: {
            status: 'hidden',
            visibleDesktop: false,
            visibleMobile: false
          }
        });
      }
    }
  });

  for (const target of TARGETS) {
    const site = await prisma.agencySite.findUnique({
      where: { id: target.siteId },
      include: { pages: { include: { blocks: true } } }
    });
    const blocks = site.pages.flatMap(page => page.blocks);
    for (const expected of target.blocks) {
      const block = blocks.find(b => b.id === expected.id);
      if (!block) throw new Error(`Post-apply block missing: ${expected.id}`);
      if (block.status !== 'hidden' || block.visibleDesktop !== false || block.visibleMobile !== false) {
        throw new Error(`Post-apply visibility validation failed for ${expected.id}`);
      }
    }
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    scope: 'NETWORK_LEGACY_GENERIC_CONTENT_CLEANUP',
    targetSites: TARGETS.length,
    blockUpdates: blockCount,
    routeWrites: 0,
    agencyWrites: 0,
    pageSeoWrites: 0,
    lamorlayeWrites: 0,
    mode: 'APPLY',
    originalGuardFingerprint,
    mutationPerformed: true,
    snapshot: snapshotPath
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
