const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONTRACT = 'MSE-25.230';
const CONFIRM = process.env.MSE_25_230_CONFIRM === 'true';
const SNAPSHOT = process.env.MSE_25_230_SNAPSHOT || '/app/runtime-snapshots/mse-25-230-nevers-final-grounding-conversion-v1.snapshot.json';
const TARGET = { siteId: 'cms8n8b5v003vn91af2wlyks9', slug: 'ambassade-fram-mondescale-nevers', agencyId: 2 };
const PRINCESS_IMAGE = 'cmsrqk4bi000amn1asf0dfpx7';

const replacements = [
  {
    page: 'home', id: 'cmsztn3i700butdhd6fx1961g', oldMarker: 'Pourquoi passer par une agence pour accueil ?',
    content: {
      title: 'Questions fréquentes sur votre agence de voyages à Nevers',
      items: [
        { question: 'Pourquoi préparer son voyage avec une agence à Nevers ?', answer: 'Un échange avec Princess permet de préciser vos dates, votre budget et vos priorités avant de comparer les solutions adaptées à votre projet. L’agence reste ensuite votre point de contact pour la réservation et le suivi du dossier.' },
        { question: 'Comment demander un devis à l’agence de Nevers ?', answer: 'Vous pouvez contacter l’agence par téléphone, utiliser le formulaire de contact ou venir au C.C Carré Colbert - 7 Rue etienne Litaud à Nevers pour présenter votre projet.' },
        { question: 'L’agence accompagne-t-elle aussi les voyageurs des villes voisines ?', answer: 'Oui. L’agence de Nevers accompagne notamment des voyageurs de Varennes-Vauzelles, Coulanges-lès-Nevers et Marzy qui souhaitent préparer leur voyage avec un interlocuteur de proximité.' }
      ]
    }
  },
  {
    page: 'agence', id: 'cmsxhfgdw0060p11a6nb7wx0k', oldMarker: 'Votre équipe',
    content: { title: 'Princess vous accueille à Nevers', members: [{ name: 'Princess', role: 'Conseillère voyage', imageAlt: "Princess, conseillère voyage à l'agence Mondescale Nevers", imageUrl: null, description: 'Princess vous accompagne dans la préparation de vos voyages.', imageAssetId: PRINCESS_IMAGE }] }
  },
  {
    page: 'equipe', id: 'cmsztn3el00b1tdhdbqijrafn', oldMarker: 'Votre équipe',
    content: { title: 'Princess, votre conseillère voyage à Nevers', members: [{ name: 'Princess', role: 'Conseillère voyage', imageAlt: "Princess, conseillère voyage à l'agence Mondescale Nevers", imageUrl: null, description: 'Princess vous accompagne dans la préparation de vos voyages.', imageAssetId: PRINCESS_IMAGE }] }
  },
  {
    page: 'services', id: 'cmt8gh0xq001ntdb2pfbvqncr', oldMarker: 'Pourquoi passer par une agence pour nos services ?',
    content: {
      title: 'Questions fréquentes sur nos services à Nevers',
      items: [
        { question: 'L’agence de Nevers peut-elle réserver uniquement des billets d’avion ?', answer: 'Oui. La billetterie aérienne fait partie des services proposés. L’agence peut étudier les horaires, correspondances, bagages et conditions tarifaires disponibles au moment de la recherche.' },
        { question: 'Quels types de voyages l’agence peut-elle préparer ?', answer: 'L’agence accompagne notamment les projets de séjours, circuits, voyages sur mesure, croisières, voyages de noces, groupes et billetterie.' },
        { question: 'Puis-je demander une recherche adaptée à mon budget ?', answer: 'Oui. Préciser votre budget, vos dates et vos priorités permet à l’équipe de concentrer ses recherches sur les solutions correspondant à votre demande.' }
      ]
    }
  },
  {
    page: 'contact', id: 'cmsw1f3ts00i1p11abdd7gwsb', oldMarker: 'Pourquoi passer par une agence pour contact ?',
    content: {
      title: 'Questions fréquentes avant de contacter l’agence de Nevers',
      items: [
        { question: 'Quelles informations préparer avant de demander un devis ?', answer: 'Vos dates ou période de départ, le nombre de voyageurs, votre budget et vos principales attentes permettent à l’équipe de mieux cadrer la recherche dès le premier échange.' },
        { question: 'Comment contacter l’agence Mondescale Nevers ?', answer: 'Vous pouvez joindre l’agence par téléphone, utiliser le formulaire de cette page ou vous rendre au C.C Carré Colbert - 7 Rue etienne Litaud, 58000 Nevers.' },
        { question: 'Puis-je prendre contact pour une réservation de vols uniquement ?', answer: 'Oui. La billetterie fait partie des services de l’agence. Princess peut étudier avec vous les solutions disponibles et les principales conditions associées au billet.' }
      ]
    }
  }
];

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {});
  return value;
}
function sameJson(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function fingerprint(rows) { return crypto.createHash('sha256').update(JSON.stringify(canonical(rows.map(r => [r.id, r.content])))).digest('hex'); }

async function main() {
  const site = await prisma.agencySite.findUnique({ where: { id: TARGET.siteId }, include: { agency: true, pages: { include: { blocks: true } } } });
  if (!site || site.slug !== TARGET.slug || site.agencyId !== TARGET.agencyId || site.agency?.id !== TARGET.agencyId) throw new Error('Strict Nevers target guard failed');

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
    if (!hit || !sameJson(hit.content, r.content)) throw new Error(`Post-apply validation failed for ${r.id}`);
  }

  console.log(JSON.stringify({ ...base, mode: 'APPLY', originalGuardFingerprint: guardFingerprint, mutationPerformed: true, snapshot: SNAPSHOT }, null, 2));
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
