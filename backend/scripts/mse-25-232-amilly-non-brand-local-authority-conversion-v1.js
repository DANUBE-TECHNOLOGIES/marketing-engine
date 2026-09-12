const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONTRACT = 'MSE-25.232';
const CONFIRM_ENV = 'MSE_25_232_CONFIRM';
const SNAPSHOT_ENV = 'MSE_25_232_SNAPSHOT';
const DEFAULT_SNAPSHOT = '/app/runtime-snapshots/mse-25-232-amilly-non-brand-local-authority-conversion-v1.snapshot.json';

const TARGET = {
  siteId: 'cms8n8pu600qvn91a6bo0gx6v',
  slug: 'tui-store-amilly',
  agencyId: 9,
};

const BLOCK_UPDATES = [
  {
    id: 'cmsw1f7h5010gp11a7p5y87pe',
    expectedPageSlug: '',
    expectedType: 'faq',
    expectedMarker: 'Pourquoi passer par une agence pour accueil ?',
    content: {
      title: 'Questions fréquentes sur votre agence de voyages à Amilly et Montargis',
      items: [
        {
          question: 'Pourquoi passer par une agence de voyages à Amilly ?',
          answer: 'Un échange en agence permet de comparer les solutions, de clarifier votre budget et vos priorités puis de conserver un point de contact identifié avant, pendant et après le voyage.'
        },
        {
          question: 'L’agence accompagne-t-elle aussi les voyageurs de Montargis et des environs ?',
          answer: 'Oui. TUI STORE Amilly accompagne notamment les voyageurs d’Amilly, de Montargis, de Villemandeur, de Châlette-sur-Loing et plus largement de l’agglomération montargoise.'
        },
        {
          question: 'Comment demander un devis personnalisé ?',
          answer: 'Vous pouvez contacter TUI STORE Amilly par téléphone, via le formulaire de contact ou directement en agence au Centre commercial Antibes à Amilly.'
        }
      ]
    }
  },
  {
    id: 'cmsw1f7h4010dp11a1uak3gfn',
    expectedPageSlug: '',
    expectedType: 'team',
    expectedMarker: 'Votre équipe',
    content: {
      title: 'Votre agence TUI STORE Amilly',
      members: []
    }
  },
  {
    id: 'cmsw1f7kf010yp11aj3nttrvo',
    expectedPageSlug: 'agence',
    expectedType: 'team',
    expectedMarker: 'Votre équipe',
    content: {
      title: 'Une équipe de conseillers à votre écoute à Amilly',
      members: []
    }
  },
  {
    id: 'cmsw1f7mm011dp11a3uwzjvjo',
    expectedPageSlug: 'equipe',
    expectedType: 'team',
    expectedMarker: 'Votre équipe',
    content: {
      title: 'Les conseillers de votre agence TUI STORE Amilly',
      members: []
    }
  },
  {
    id: 'cmsw1f7u0012op11am6y2hjco',
    expectedPageSlug: 'services',
    expectedType: 'faq',
    expectedMarker: 'Pourquoi passer par une agence pour nos services ?',
    content: {
      title: 'Questions fréquentes sur nos services voyage à Amilly et Montargis',
      items: [
        {
          question: 'Puis-je réserver uniquement un billet d’avion ?',
          answer: 'Oui. L’agence propose un service de billetterie et peut vous aider à comparer les vols, les horaires, les correspondances, les bagages et les principales conditions tarifaires.'
        },
        {
          question: 'Quels types de voyages préparez-vous depuis Amilly ?',
          answer: 'L’agence accompagne les projets de séjours, circuits, voyages sur mesure, croisières, voyages de noces, groupes et billetterie pour les voyageurs d’Amilly, de Montargis et de l’agglomération montargoise.'
        },
        {
          question: 'Pouvez-vous adapter un projet à mon budget et à mes dates ?',
          answer: 'Oui. Les conseillers étudient les possibilités en fonction de vos dates, de votre budget, de vos priorités et de votre façon de voyager.'
        }
      ]
    }
  },
  {
    id: 'cmsw1f8280143p11a3hk27fwl',
    expectedPageSlug: 'contact',
    expectedType: 'faq',
    expectedMarker: 'Pourquoi passer par une agence pour contact ?',
    content: {
      title: 'Questions fréquentes avant de contacter TUI STORE Amilly',
      items: [
        {
          question: 'Quelles informations préparer avant de contacter l’agence ?',
          answer: 'Indiquez si possible vos dates ou votre période de départ, le nombre de voyageurs, votre budget indicatif, vos préférences et les contraintes importantes de votre projet.'
        },
        {
          question: 'Comment contacter l’agence depuis Amilly ou Montargis ?',
          answer: 'Vous pouvez joindre TUI STORE Amilly par téléphone, utiliser le formulaire de contact ou vous rendre en agence au Centre commercial Antibes, 45200 Amilly.'
        },
        {
          question: 'L’agence peut-elle étudier un besoin de billetterie seule ?',
          answer: 'Oui. L’agence peut étudier un besoin de billet d’avion seul et vous aider à comparer les options ainsi que les principales conditions associées.'
        }
      ]
    }
  },
  {
    id: 'cmsw1f7u0012mp11a9gl99271',
    expectedPageSlug: 'services',
    expectedType: 'text',
    expectedMarker: 'TUI STORE Amilly accompagne ses clients',
    content: {
      title: 'Billetterie et voyages depuis Amilly, Montargis et l’agglomération montargoise',
      text: 'TUI STORE Amilly accompagne les voyageurs d’Amilly, de Montargis, de Villemandeur, de Châlette-sur-Loing et de l’agglomération montargoise pour leurs billets d’avion, séjours, circuits, croisières et voyages sur mesure. L’agence vous aide à comparer les solutions et à organiser un projet adapté à vos dates, à votre budget et à vos priorités.'
    }
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

function includesMarker(content, marker) {
  return JSON.stringify(content || {}).includes(marker);
}

async function readTargetState(client) {
  const site = await client.agencySite.findUnique({
    where: { id: TARGET.siteId },
    include: {
      agency: true,
      pages: {
        include: { blocks: true }
      }
    }
  });

  if (!site) throw new Error(`Target site ${TARGET.siteId} not found`);
  if (site.slug !== TARGET.slug) throw new Error(`Unexpected slug: ${site.slug}`);
  if (site.agencyId !== TARGET.agencyId) throw new Error(`Unexpected agencyId: ${site.agencyId}`);

  const pageByBlock = new Map();
  for (const page of site.pages) {
    for (const block of page.blocks) pageByBlock.set(block.id, page);
  }

  const rows = [];
  for (const update of BLOCK_UPDATES) {
    const page = pageByBlock.get(update.id);
    if (!page) throw new Error(`Block ${update.id} not found on target site`);
    const block = page.blocks.find(b => b.id === update.id);
    if (page.slug !== update.expectedPageSlug) {
      throw new Error(`Block ${update.id} page mismatch: expected '${update.expectedPageSlug}', got '${page.slug}'`);
    }
    if (block.blockType !== update.expectedType) {
      throw new Error(`Block ${update.id} type mismatch: expected ${update.expectedType}, got ${block.blockType}`);
    }
    if (!includesMarker(block.content, update.expectedMarker)) {
      throw new Error(`Block ${update.id} guard marker missing: ${update.expectedMarker}`);
    }
    rows.push({
      blockId: block.id,
      pageId: page.id,
      pageSlug: page.slug,
      blockType: block.blockType,
      content: block.content
    });
  }

  return { site, rows };
}

async function main() {
  const apply = process.env[CONFIRM_ENV] === 'true';
  const snapshotPath = process.env[SNAPSHOT_ENV] || DEFAULT_SNAPSHOT;
  const { rows } = await readTargetState(prisma);
  const originalGuardFingerprint = fingerprint(rows);

  const plan = BLOCK_UPDATES.map(update => ({
    blockId: update.id,
    pageSlug: update.expectedPageSlug || '/',
    blockType: update.expectedType,
    operation: 'UPDATE_CONTENT_ONLY'
  }));

  if (!apply) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      target: TARGET.slug,
      agencyId: TARGET.agencyId,
      blockUpdates: BLOCK_UPDATES.length,
      targetPages: new Set(BLOCK_UPDATES.map(x => x.expectedPageSlug)).size,
      routeWrites: 0,
      agencyWrites: 0,
      pageSeoWrites: 0,
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
    target: TARGET,
    createdAt: new Date().toISOString(),
    guardFingerprint: originalGuardFingerprint,
    blocks: rows
  }, null, 2));

  await prisma.$transaction(async tx => {
    const current = await readTargetState(tx);
    const currentFingerprint = fingerprint(current.rows);
    if (currentFingerprint !== originalGuardFingerprint) {
      throw new Error(`Concurrent change detected: ${currentFingerprint} != ${originalGuardFingerprint}`);
    }

    for (const update of BLOCK_UPDATES) {
      await tx.pageBlock.update({
        where: { id: update.id },
        data: { content: update.content }
      });
    }
  });

  const after = await prisma.agencySite.findUnique({
    where: { id: TARGET.siteId },
    include: { pages: { include: { blocks: true } } }
  });

  const allBlocks = after.pages.flatMap(page => page.blocks.map(block => ({ page, block })));
  for (const update of BLOCK_UPDATES) {
    const found = allBlocks.find(x => x.block.id === update.id);
    if (!found) throw new Error(`Post-apply block missing: ${update.id}`);
    if (canonicalJson(found.block.content) !== canonicalJson(update.content)) {
      throw new Error(`Post-apply validation failed for ${update.id}`);
    }
  }

  console.log(JSON.stringify({
    contract: CONTRACT,
    target: TARGET.slug,
    agencyId: TARGET.agencyId,
    blockUpdates: BLOCK_UPDATES.length,
    targetPages: new Set(BLOCK_UPDATES.map(x => x.expectedPageSlug)).size,
    routeWrites: 0,
    agencyWrites: 0,
    pageSeoWrites: 0,
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
