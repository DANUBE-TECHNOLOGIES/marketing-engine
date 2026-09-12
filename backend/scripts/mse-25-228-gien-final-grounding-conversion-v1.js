const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONTRACT = 'MSE-25.228';
const CONFIRM = process.env.MSE_25_228_CONFIRM === 'true';
const SNAPSHOT = process.env.MSE_25_228_SNAPSHOT || '/app/runtime-snapshots/mse-25-228-gien-final-grounding-conversion-v1.snapshot.json';
const TARGET = { siteId: 'cms8n8ekq00bjn91aw58um45w', slug: 'ambassade-fram-mondescale-gien', agencyId: 4 };

const replacements = [
  {
    page: 'home', id: 'cmsztn29m006ktdhdva9xkq60',
    oldMarker: 'Pourquoi passer par une agence pour accueil ?',
    content: {
      items: [
        { question: 'Pourquoi préparer son voyage avec une agence à Gien ?', answer: 'Un échange en agence permet de préciser vos dates, votre budget et vos priorités avant de comparer les solutions de voyage. L’équipe de Gien reste ensuite votre point de contact pour la réservation et le suivi du dossier.' },
        { question: 'Comment demander un devis à l’agence de Gien ?', answer: 'Vous pouvez contacter l’agence par téléphone, utiliser le formulaire de contact ou venir au 12 Rue Gambetta à Gien pour présenter votre projet.' },
        { question: 'L’agence peut-elle adapter les recherches à mon budget ?', answer: 'Oui. Indiquer votre budget et vos priorités dès le premier échange aide l’équipe à concentrer ses recherches sur les solutions correspondant réellement à votre demande.' }
      ],
      title: 'Questions fréquentes sur votre agence de voyages à Gien'
    }
  },
  {
    page: 'agence', id: 'cmsxhfh7i009up11aubyif8z2', oldMarker: 'Votre équipe',
    content: { title: 'Marie-Claire vous accueille à Gien', members: [{ name: 'Marie-Claire', role: 'Conseillère voyage', imageAlt: "Marie-Claire, conseillère voyage à l'agence Mondescale Gien", imageUrl: null, description: 'Marie-Claire vous accompagne dans la préparation de vos voyages.', imageAssetId: 'cmsrqq206000fmn1acj5f6nt8' }] }
  },
  {
    page: 'equipe', id: 'cmsztn24t005rtdhdi28ulz5j', oldMarker: 'Votre équipe',
    content: { title: 'Marie-Claire, votre conseillère voyage à Gien', members: [{ name: 'Marie-Claire', role: 'Conseillère voyage', imageAlt: "Marie-Claire, conseillère voyage à l'agence Mondescale Gien", imageUrl: null, description: 'Marie-Claire vous accompagne dans la préparation de vos voyages.', imageAssetId: 'cmsrqq206000fmn1acj5f6nt8' }] }
  },
  {
    page: 'contact', id: 'cmsw1f5is00qtp11azonfkla0', oldMarker: 'Pourquoi passer par une agence pour contact ?',
    content: {
      items: [
        { question: 'Quelles informations préparer avant de demander un devis ?', answer: 'Vos dates ou période de départ, le nombre de voyageurs, votre budget et vos principales attentes permettent à l’équipe de mieux cadrer la recherche dès le premier échange.' },
        { question: 'Comment contacter l’agence Mondescale Gien ?', answer: 'Vous pouvez joindre l’agence par téléphone, utiliser le formulaire de cette page ou vous rendre au 12 Rue Gambetta, 45500 Gien.' },
        { question: 'Puis-je contacter l’agence pour un billet d’avion uniquement ?', answer: 'Oui. La billetterie fait partie des services proposés par l’agence de Gien, qui peut étudier avec vous les horaires, correspondances, bagages et conditions tarifaires disponibles au moment de la recherche.' }
      ],
      title: 'Questions fréquentes avant de contacter l’agence de Gien'
    }
  }
];

function fingerprint(rows) { return crypto.createHash('sha256').update(JSON.stringify(rows.map(r => [r.id, r.content]))).digest('hex'); }

async function main() {
  const site = await prisma.agencySite.findUnique({ where: { id: TARGET.siteId }, include: { agency: true, pages: { include: { blocks: true } } } });
  if (!site || site.slug !== TARGET.slug || site.agencyId !== TARGET.agencyId || site.agency?.id !== TARGET.agencyId) throw new Error('Strict Gien target guard failed');

  const pageByBlock = new Map();
  for (const p of site.pages) for (const b of p.blocks) pageByBlock.set(b.id, { page: p.slug, block: b });
  const current = [];
  for (const r of replacements) {
    const hit = pageByBlock.get(r.id);
    if (!hit) throw new Error(`Missing guarded block ${r.id}`);
    if (hit.page !== r.page) throw new Error(`Page guard failed for ${r.id}: ${hit.page}`);
    if (!JSON.stringify(hit.block.content).includes(r.oldMarker)) throw new Error(`Content guard failed for ${r.id}: ${r.oldMarker}`);
    current.push({ id: r.id, page: r.page, content: hit.block.content });
  }
  const guardFingerprint = fingerprint(current);
  const plan = replacements.map((r, i) => ({ blockId: r.id, pageSlug: r.page, oldContent: current[i].content, newContent: r.content }));
  const base = { contract: CONTRACT, target: TARGET.slug, agencyId: TARGET.agencyId, blockUpdates: replacements.length, targetPages: new Set(replacements.map(r => r.page)).size, routeWrites: 0, agencyWrites: 0, pageSeoWrites: 0 };

  if (!CONFIRM) {
    console.log(JSON.stringify({ ...base, mode: 'DRY_RUN', guardFingerprint, plan, mutationPerformed: false }, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify({ contract: CONTRACT, target: TARGET, guardFingerprint, capturedAt: new Date().toISOString(), blocks: current }, null, 2), { mode: 0o600 });

  await prisma.$transaction(async tx => {
    for (const r of replacements) await tx.pageBlock.update({ where: { id: r.id }, data: { content: r.content } });
  });

  const ids = replacements.map(r => r.id);
  const after = await prisma.pageBlock.findMany({ where: { id: { in: ids } } });
  if (after.length !== replacements.length) throw new Error('Post-apply block count guard failed');
  for (const r of replacements) {
    const hit = after.find(b => b.id === r.id);
    if (JSON.stringify(hit.content) !== JSON.stringify(r.content)) throw new Error(`Post-apply validation failed for ${r.id}`);
  }

  console.log(JSON.stringify({ ...base, mode: 'APPLY', originalGuardFingerprint: guardFingerprint, mutationPerformed: true, snapshot: SNAPSHOT }, null, 2));
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
