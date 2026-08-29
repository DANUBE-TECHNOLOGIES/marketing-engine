"use strict";

const { PrismaClient } = require("@prisma/client");
const { INTENTS } = require("../src/modules/minisite-structured-data/local-search-intent-coverage");
const { qualityForTarget } = require("../src/modules/minisite-structured-data/local-intent-target-quality");

const SERVICE_CITIES = ["Ozoir la Ferrière", "Maurepas", "Nevers", "Dax", "Gien", "Bois-Colombes", "Lamorlaye"];
const CONTACT_CITIES = ["Ozoir la Ferrière", "Maurepas", "Nevers", "Gien", "Lamorlaye"];
const TARGETS = [...SERVICE_CITIES.map(city => ({ city, slug: "services", intent: "ticketing" })), ...CONTACT_CITIES.map(city => ({ city, slug: "contact", intent: "appointment" }))];

function normalize(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function published(block) { return block?.published === true || block?.isPublished === true || String(block?.status || "").toLowerCase() === "published"; }
function publicPage(page) { return { ...page, blocks: (page.blocks || []).filter(published) }; }
function pageFor(site, slug) { return (site.pages || []).find(p => normalize(p.slug) === normalize(slug)); }
function intentFor(key) { return INTENTS.find(i => i.key === key); }
function quality(page, city, key) { return qualityForTarget(publicPage(page), city, intentFor(key)); }
function content(block) { return block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {}; }
function firstPublishedRichText(page) { return (page.blocks || []).find(b => published(b) && normalize(b.blockType || b.type).replace(/\s+/g, "-") === "rich-text"); }

function serviceTitle(city) { return `Billetterie et vols à ${city}`; }
function contactTitle(city) { return `Contact et rendez-vous avec votre agence de voyages à ${city}`; }
function contactHtml(city) {
  return `<p>Pour préparer votre voyage à ${city}, contactez directement notre agence de voyages afin d’échanger avec un conseiller et de convenir d’un rendez-vous. Nous prenons le temps de comprendre votre projet, vos dates, votre budget, vos préférences de transport et d’hébergement ainsi que les besoins particuliers des voyageurs.</p><p>Un rendez-vous avec notre équipe à ${city} permet d’étudier les différentes possibilités, de comparer les solutions adaptées et de construire votre séjour avec un accompagnement personnalisé. Vous pouvez nous contacter pour un voyage en France ou à l’étranger, un circuit, un séjour, une croisière, une réservation de vols ou un projet sur mesure.</p><p>Notre agence reste votre interlocuteur avant la réservation et pour le suivi du dossier. Pour toute question, demande de devis ou prise de rendez-vous à ${city}, utilisez les coordonnées et moyens de contact présents sur cette page.</p>`;
}

function project(page, target) {
  const next = clone(page);
  const block = firstPublishedRichText(next);
  if (!block) throw new Error(`MSE-25.93: aucun rich_text publié pour ${target.city}/${target.slug}`);
  const c = content(block);
  if (target.slug === "services") block.content = { ...c, title: serviceTitle(target.city) };
  else block.content = { ...c, title: contactTitle(target.city), html: contactHtml(target.city) };
  return next;
}

async function load(prisma, tenantId) {
  return prisma.agencySite.findMany({ where: { tenantId }, include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } });
}

async function main() {
  const apply = String(process.env.MSE_25_93_CONFIRM || "").toLowerCase() === "true";
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: process.env.TENANT_SLUG || "mondescale" } });
    if (!tenant) throw new Error("MSE-25.93: tenant introuvable");
    const sites = await load(prisma, tenant.id);
    const plans = TARGETS.map(target => {
      const site = sites.find(s => normalize(s.agency?.city) === normalize(target.city));
      const page = site && pageFor(site, target.slug);
      if (!page) throw new Error(`MSE-25.93: cible absente ${target.city}/${target.slug}`);
      const block = firstPublishedRichText(page);
      if (!block) throw new Error(`MSE-25.93: bloc publié absent ${target.city}/${target.slug}`);
      const before = quality(page, target.city, target.intent);
      const after = quality(project(page, target), target.city, target.intent);
      return { ...target, site, page, block, before, after };
    });
    const bad = plans.filter(p => p.after.score < 80 || p.after.status !== "strong");
    if (bad.length) throw new Error(`MSE-25.93: projection publique non strong: ${JSON.stringify(bad.map(p => ({city:p.city,slug:p.slug,after:p.after})))}`);

    const snapshots = [];
    if (apply) await prisma.$transaction(async tx => {
      for (const p of plans) {
        const previous = clone(content(p.block));
        const projectedBlock = firstPublishedRichText(project(p.page, p));
        snapshots.push({ city:p.city, slug:p.slug, blockId:p.block.id, content:previous });
        await tx.pageBlock.update({ where:{ id:p.block.id }, data:{ content:projectedBlock.content } });
      }
    });

    const fresh = apply ? await load(prisma, tenant.id) : sites;
    const persisted = TARGETS.map(target => {
      const site = fresh.find(s => normalize(s.agency?.city) === normalize(target.city));
      const page = pageFor(site, target.slug);
      return { city:target.city, slug:target.slug, ...quality(page, target.city, target.intent) };
    });
    if (apply && persisted.some(x => x.score < 80 || x.status !== "strong")) throw new Error(`MSE-25.93: contrôle persisté non strong: ${JSON.stringify(persisted)}`);

    console.log(JSON.stringify({ mse:"25.93", dryRun:!apply, writes:apply, targets:plans.length, frontendFilesTouched:0, pageCreationCount:0, draftBlocksPublished:0, draftBlocksModified:0, projections:plans.map(p => ({city:p.city,slug:p.slug,before:{score:p.before.score,status:p.before.status},after:{score:p.after.score,status:p.after.status}})), persisted, snapshots:apply?snapshots:undefined }, null, 2));
  } finally { await prisma.$disconnect(); }
}

main().catch(error => { console.error(error); process.exit(1); });
