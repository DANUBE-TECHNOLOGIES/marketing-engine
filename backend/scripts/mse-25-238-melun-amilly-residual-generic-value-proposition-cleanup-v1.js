const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONTRACT = 'MSE-25.238';
const CONFIRM_ENV = 'MSE_25_238_CONFIRM';
const SNAPSHOT_ENV = 'MSE_25_238_SNAPSHOT';
const DEFAULT_SNAPSHOT = '/app/runtime-snapshots/mse-25-238-melun-amilly-residual-generic-value-proposition-cleanup-v1.snapshot.json';

const GENERIC_MARKERS = [
  'Un accompagnement humain adapté à votre projet et à votre budget.',
  'Des conseillers expérimentés et des partenaires sélectionnés.',
  'Une équipe disponible avant, pendant et après votre départ.'
];

const TARGETS = [
  {
    agencyId: 8,
    siteId: 'cms8n8or700n1n91a488phqrp',
    slug: 'tui-store-melun',
    blockId: 'cmtpzcp2g0003q9b1v1f8cn5i',
    pageSlug: 'agence',
    title: 'Pourquoi choisir notre agence de voyages à Melun ?',
    introduction: 'À Melun, TUI STORE Melun vous aide à transformer une idée de voyage en projet clair, en tenant compte de vos dates, de votre budget, du rythme recherché et des conditions de réservation.',
    items: [
      {
        title: 'Un projet étudié à Melun',
        text: 'Nous prenons le temps de préciser vos priorités avant de comparer les séjours, circuits, croisières ou solutions de transport adaptés à votre demande.'
      },
      {
        title: 'Des choix expliqués',
        text: 'Au-delà du prix affiché, nous attirons votre attention sur les prestations incluses, les conditions tarifaires et les points qui peuvent réellement faire la différence.'
      },
      {
        title: 'Un interlocuteur pour votre dossier',
        text: 'Votre agence de Melun reste votre point de contact pour le suivi de la réservation, les formalités utiles et les questions qui surviennent avant le départ.'
      }
    ]
  },
  {
    agencyId: 8,
    siteId: 'cms8n8or700n1n91a488phqrp',
    slug: 'tui-store-melun',
    blockId: 'cmsqctsqh0065mn5ynuljdh4f',
    pageSlug: '',
    title: 'Préparer votre voyage avec notre agence de Melun',
    introduction: 'Depuis le centre de Melun, notre agence accompagne les voyageurs qui souhaitent comparer les possibilités et sécuriser les étapes importantes de leur prochain départ.',
    items: [
      {
        title: 'Partir de votre besoin réel',
        text: 'Destination, période, budget, composition des voyageurs et envies de séjour servent de point de départ à la recherche plutôt qu’une offre standard.'
      },
      {
        title: 'Comparer avec méthode',
        text: 'Nous rapprochons les différentes solutions de voyage en regardant les prestations, les horaires, les conditions et la cohérence globale de chaque proposition.'
      },
      {
        title: 'Garder un contact local',
        text: 'Vous disposez d’un interlocuteur à Melun pour avancer sur le devis, finaliser la réservation et suivre votre dossier jusqu’au départ.'
      }
    ]
  },
  {
    agencyId: 9,
    siteId: 'cms8n8pu600qvn91a6bo0gx6v',
    slug: 'tui-store-amilly',
    blockId: 'cmsw1f7kf010xp11aascr6kvl',
    pageSlug: 'agence',
    title: 'Une agence de voyages de proximité à Amilly',
    introduction: 'Installée au Centre commercial Antibes à Amilly, notre agence accompagne les voyageurs d’Amilly, de Montargis et des environs dans la préparation de séjours, circuits, croisières, billets d’avion et voyages sur mesure.',
    items: [
      {
        title: 'Comprendre votre projet',
        text: 'Nous partons de vos dates, de votre budget, de vos habitudes de voyage et de vos priorités pour orienter la recherche vers les solutions réellement adaptées.'
      },
      {
        title: 'Comparer au-delà d’une seule offre',
        text: 'Notre rôle est de mettre en perspective les différentes possibilités, les prestations incluses et les conditions de réservation avant votre décision.'
      },
      {
        title: 'Rester disponible localement',
        text: 'Votre agence d’Amilly reste votre interlocuteur pour les étapes du dossier, les formalités et les questions utiles jusqu’au départ.'
      }
    ]
  },
  {
    agencyId: 9,
    siteId: 'cms8n8pu600qvn91a6bo0gx6v',
    slug: 'tui-store-amilly',
    blockId: 'cmsw1f7oq011sp11anas3pc70',
    pageSlug: 'engagements',
    title: 'Nos engagements pour votre voyage à Amilly',
    introduction: 'À Amilly, nous privilégions des conseils compréhensibles et des propositions cohérentes avec votre demande, afin que vous sachiez ce que vous réservez et pourquoi cette solution vous est proposée.',
    items: [
      {
        title: 'Une recommandation argumentée',
        text: 'Nous vous expliquons les points forts, les limites et les conditions importantes des solutions étudiées plutôt que de nous limiter à un prix d’appel.'
      },
      {
        title: 'Un voyage cohérent de bout en bout',
        text: 'Transport, hébergement, assurances, formalités et prestations complémentaires sont examinés ensemble pour éviter les choix incohérents.'
      },
      {
        title: 'Un suivi identifié',
        text: 'Vous savez qui contacter à l’agence d’Amilly pour suivre votre réservation et obtenir une réponse lorsque votre dossier évolue.'
      }
    ]
  },
  {
    agencyId: 9,
    siteId: 'cms8n8pu600qvn91a6bo0gx6v',
    slug: 'tui-store-amilly',
    blockId: 'cmsw1f7h4010ap11axikz7s0q',
    pageSlug: '',
    title: 'Votre agence de voyages à Amilly, près de Montargis',
    introduction: 'Que votre projet soit un séjour, un circuit, une croisière, un voyage sur mesure ou un billet d’avion, l’agence d’Amilly vous aide à comparer les options avant de réserver.',
    items: [
      {
        title: 'Un échange de proximité',
        text: 'Depuis Amilly, nous accueillons aussi les voyageurs de Montargis et des communes voisines qui souhaitent préparer leur départ avec un interlocuteur en agence.'
      },
      {
        title: 'Des solutions adaptées au projet',
        text: 'Nous sélectionnons les possibilités selon vos priorités de dates, de budget, de confort et de rythme plutôt que d’appliquer une réponse identique à tous les voyageurs.'
      },
      {
        title: 'Un dossier suivi jusqu’au départ',
        text: 'Une fois votre choix effectué, l’agence reste disponible pour les étapes de réservation, les documents utiles et les questions de préparation.'
      }
    ]
  }
];

const LAMORLAYE = {
  agencyId: 7,
  siteId: 'cms8n8jdu00j7n91axodw128b',
  slug: 'mondescale-lamorlaye'
};

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

function fingerprint(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function contentContainsGenericMarkers(content) {
  const raw = JSON.stringify(content || {});
  return GENERIC_MARKERS.every(marker => raw.includes(marker));
}

function localizedContent(original, target) {
  const current = original && typeof original === 'object' && !Array.isArray(original) ? original : {};
  const currentItems = Array.isArray(current.items) ? current.items : [];
  const items = target.items.map((item, index) => ({
    ...(currentItems[index] && typeof currentItems[index] === 'object' ? currentItems[index] : {}),
    title: item.title,
    text: item.text
  }));

  return {
    ...current,
    title: target.title,
    introduction: target.introduction,
    items
  };
}

async function readTargetRows(client) {
  const rows = [];

  for (const target of TARGETS) {
    const site = await client.agencySite.findUnique({
      where: { id: target.siteId },
      include: { pages: { include: { blocks: true } } }
    });

    if (!site) throw new Error(`Target site missing: ${target.siteId}`);
    if (site.slug !== target.slug) throw new Error(`Site slug mismatch for ${target.siteId}: ${site.slug}`);
    if (site.agencyId !== target.agencyId) throw new Error(`Agency mismatch for ${target.slug}: ${site.agencyId}`);

    let foundPage = null;
    let foundBlock = null;
    for (const page of site.pages) {
      const block = page.blocks.find(candidate => candidate.id === target.blockId);
      if (block) {
        foundPage = page;
        foundBlock = block;
        break;
      }
    }

    if (!foundBlock || !foundPage) throw new Error(`Target block missing: ${target.blockId}`);
    if (foundPage.slug !== target.pageSlug) {
      throw new Error(`Page guard failed for ${target.blockId}: expected '${target.pageSlug}', got '${foundPage.slug}'`);
    }
    if (foundBlock.status !== 'published') {
      throw new Error(`Status guard failed for ${target.blockId}: ${foundBlock.status}`);
    }
    if (foundBlock.visibleDesktop !== true || foundBlock.visibleMobile !== true) {
      throw new Error(`Visibility guard failed for ${target.blockId}`);
    }
    if (!contentContainsGenericMarkers(foundBlock.content)) {
      throw new Error(`Generic-content guard failed for ${target.blockId}`);
    }

    rows.push({
      siteId: site.id,
      siteSlug: site.slug,
      agencyId: site.agencyId,
      pageId: foundPage.id,
      pageSlug: foundPage.slug,
      blockId: foundBlock.id,
      blockType: foundBlock.blockType,
      status: foundBlock.status,
      visibleDesktop: foundBlock.visibleDesktop,
      visibleMobile: foundBlock.visibleMobile,
      content: foundBlock.content,
      expectedContent: localizedContent(foundBlock.content, target)
    });
  }

  return rows;
}

async function readLamorlayeState(client) {
  const site = await client.agencySite.findUnique({
    where: { id: LAMORLAYE.siteId },
    include: {
      agency: true,
      pages: { include: { blocks: true } }
    }
  });

  if (!site) throw new Error('Protected Lamorlaye site missing');
  if (site.slug !== LAMORLAYE.slug || site.agencyId !== LAMORLAYE.agencyId) {
    throw new Error('Protected Lamorlaye identity mismatch');
  }

  return site;
}

async function main() {
  const apply = process.env[CONFIRM_ENV] === 'true';
  const snapshotPath = process.env[SNAPSHOT_ENV] || DEFAULT_SNAPSHOT;

  const rows = await readTargetRows(prisma);
  const lamorlayeBefore = await readLamorlayeState(prisma);
  const guardFingerprint = fingerprint({ rows, lamorlaye: lamorlayeBefore });

  const plan = rows.map(row => {
    const target = TARGETS.find(item => item.blockId === row.blockId);
    return {
      siteSlug: row.siteSlug,
      agencyId: row.agencyId,
      pageSlug: row.pageSlug || '/',
      blockId: row.blockId,
      operation: 'REPLACE_RESIDUAL_GENERIC_VALUE_PROPOSITION',
      newTitle: target.title
    };
  });

  if (!apply) {
    console.log(JSON.stringify({
      contract: CONTRACT,
      scope: 'MELUN_AMILLY_RESIDUAL_GENERIC_VALUE_PROPOSITION_CLEANUP',
      mode: 'DRY_RUN',
      mutationPerformed: false,
      targetSites: 2,
      blockWrites: TARGETS.length,
      routeWrites: 0,
      pageSeoWrites: 0,
      agencyWrites: 0,
      protectedSites: [LAMORLAYE.slug],
      protectedWrites: 0,
      guardFingerprint,
      plan
    }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify({
    contract: CONTRACT,
    createdAt: new Date().toISOString(),
    guardFingerprint,
    targets: rows,
    protectedLamorlaye: lamorlayeBefore
  }, null, 2));

  await prisma.$transaction(async tx => {
    const currentRows = await readTargetRows(tx);
    const currentLamorlaye = await readLamorlayeState(tx);
    const currentFingerprint = fingerprint({ rows: currentRows, lamorlaye: currentLamorlaye });

    if (currentFingerprint !== guardFingerprint) {
      throw new Error(`Concurrent change detected: ${currentFingerprint} != ${guardFingerprint}`);
    }

    for (const row of currentRows) {
      await tx.pageBlock.update({
        where: { id: row.blockId },
        data: { content: row.expectedContent }
      });
    }
  });

  const verification = [];
  for (const target of TARGETS) {
    const block = await prisma.pageBlock.findUnique({ where: { id: target.blockId } });
    const originalRow = rows.find(row => row.blockId === target.blockId);
    const valid = !!block &&
      block.status === 'published' &&
      block.visibleDesktop === true &&
      block.visibleMobile === true &&
      canonicalJson(block.content) === canonicalJson(originalRow.expectedContent) &&
      !contentContainsGenericMarkers(block.content);

    verification.push({
      siteSlug: target.slug,
      blockId: target.blockId,
      valid,
      contentFingerprint: block ? fingerprint(block.content) : null
    });
  }

  const lamorlayeAfter = await readLamorlayeState(prisma);
  const lamorlayeUnchanged = fingerprint(lamorlayeAfter) === fingerprint(lamorlayeBefore);
  const allValid = verification.every(item => item.valid);

  if (!allValid) throw new Error('Post-apply target verification failed');
  if (!lamorlayeUnchanged) throw new Error('Protected Lamorlaye state changed');

  console.log(JSON.stringify({
    contract: CONTRACT,
    scope: 'MELUN_AMILLY_RESIDUAL_GENERIC_VALUE_PROPOSITION_CLEANUP',
    mode: 'APPLY',
    mutationPerformed: true,
    targetSites: 2,
    blockWrites: TARGETS.length,
    routeWrites: 0,
    pageSeoWrites: 0,
    agencyWrites: 0,
    protectedSites: [LAMORLAYE.slug],
    protectedWrites: 0,
    originalGuardFingerprint: guardFingerprint,
    snapshot: snapshotPath,
    lamorlayeUnchanged,
    allValid,
    verification
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
