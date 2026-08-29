"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { INTENTS } = require("../src/modules/minisite-structured-data/local-search-intent-coverage");
const { qualityForTarget } = require("../src/modules/minisite-structured-data/local-intent-target-quality");

const SERVICE_CITIES = Object.freeze(["Ozoir la Ferrière", "Maurepas", "Nevers", "Dax", "Gien", "Bois-Colombes", "Lamorlaye"]);
const CONTACT_CITIES = Object.freeze(["Ozoir la Ferrière", "Maurepas", "Nevers", "Gien", "Lamorlaye"]);
const TARGET_CITIES = Object.freeze([...new Set([...SERVICE_CITIES, ...CONTACT_CITIES])]);

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function contentOf(block) { return block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {}; }
function typeOf(block) { return normalize(block?.blockType || block?.type).replace(/\s+/g, "-"); }
function isHero(block) { return ["hero", "hero-banner", "hero-section"].includes(typeOf(block)); }
function textKey(content) { return ["description", "text", "body", "paragraph", "intro", "content", "subtitle", "subTitle"].find((key) => typeof content?.[key] === "string" && content[key].trim()) || null; }
function headingKey(content) { return ["h1", "heading", "title", "headline"].find((key) => typeof content?.[key] === "string" && content[key].trim()) || null; }
function bodyBlock(page) { return (page?.blocks || []).find((block) => !isHero(block) && textKey(contentOf(block))) || null; }
function headingBlock(page) { return (page?.blocks || []).find((block) => headingKey(contentOf(block))) || null; }
function pageBySlug(site, slug) { return (site?.pages || []).find((page) => normalize(page?.slug) === normalize(slug)) || null; }
function intent(key) { return INTENTS.find((item) => item.key === key); }
function score(page, city, key) {
  const result = qualityForTarget(page, city, intent(key));
  return { score: result.score, status: result.status };
}

function servicesSentence(city) {
  return `Pour vos billets d’avion au départ ou à destination de ${city}, notre agence vous accompagne dans la recherche de vols, le choix des horaires et des conditions tarifaires, avec un interlocuteur pour le suivi de votre dossier.`;
}
function contactSeo(city) {
  return {
    seoTitle: `Contact et rendez-vous à ${city} | Agence de voyages`,
    metaDescription: `Contactez votre agence de voyages à ${city} pour échanger avec un conseiller, convenir d’un rendez-vous et bénéficier d’un accompagnement personnalisé.`,
    h1: `Contact et rendez-vous avec votre agence de voyages à ${city}`,
  };
}
function contactSentence(city) {
  return `Pour préparer votre voyage à ${city}, contactez directement notre agence pour échanger avec un conseiller, convenir d’un rendez-vous et bénéficier d’un accompagnement personnalisé pour votre projet.`;
}

function projectService(page, sentence) {
  const projected = clone(page);
  const block = bodyBlock(projected);
  if (!block) return projected;
  const content = contentOf(block);
  const key = textKey(content);
  if (!normalize(content[key]).includes(normalize(sentence))) block.content = { ...content, [key]: `${String(content[key]).trim()} ${sentence}`.trim() };
  return projected;
}

function projectContact(page, city) {
  const projected = clone(page);
  const desired = contactSeo(city);
  projected.seoTitle = desired.seoTitle;
  projected.metaDescription = desired.metaDescription;
  const heading = headingBlock(projected);
  if (heading) {
    const content = contentOf(heading);
    const key = headingKey(content);
    heading.content = { ...content, [key]: desired.h1 };
  }
  const body = bodyBlock(projected);
  if (body) {
    const content = contentOf(body);
    const key = textKey(content);
    const sentence = contactSentence(city);
    if (!normalize(content[key]).includes(normalize(sentence))) body.content = { ...content, [key]: `${String(content[key]).trim()} ${sentence}`.trim() };
  }
  return projected;
}

async function loadSites(prisma, tenantId) {
  return prisma.agencySite.findMany({ where: { tenantId }, include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } });
}

function buildPlans(sites) {
  const plans = [];
  for (const city of TARGET_CITIES) {
    const site = sites.find((item) => normalize(item?.agency?.city) === normalize(city));
    if (!site) throw new Error(`MSE-25.92: mini-site introuvable pour ${city}`);
    if (SERVICE_CITIES.includes(city)) {
      const page = pageBySlug(site, "services");
      if (!page || !bodyBlock(page)) throw new Error(`MSE-25.92: texte existant /services introuvable pour ${city}`);
      plans.push({ city, role: "services", intentKey: "ticketing", page });
    }
    if (CONTACT_CITIES.includes(city)) {
      const page = pageBySlug(site, "contact");
      if (!page || !headingBlock(page)) throw new Error(`MSE-25.92: structure /contact exploitable introuvable pour ${city}`);
      plans.push({ city, role: "contact", intentKey: "appointment", page });
    }
  }
  return plans;
}

function projected(plan) { return plan.role === "services" ? projectService(plan.page, servicesSentence(plan.city)) : projectContact(plan.page, plan.city); }

async function main() {
  const dryRun = String(process.env.MSE_25_92_CONFIRM || "").toLowerCase() !== "true";
  const tenantSlug = process.env.TENANT_SLUG || "mondescale";
  const reportDir = process.env.MSE_25_92_REPORT_DIR || "/home/admin1/mse-25-92-reports";
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error(`MSE-25.92: tenant ${tenantSlug} introuvable`);
    const sites = await loadSites(prisma, tenant.id);
    const plans = buildPlans(sites);
    if (plans.length !== 12) throw new Error(`MSE-25.92: 12 actions attendues, ${plans.length} obtenues`);
    const projections = plans.map((plan) => ({ city: plan.city, role: plan.role, slug: plan.page.slug, before: score(plan.page, plan.city, plan.intentKey), after: score(projected(plan), plan.city, plan.intentKey) }));
    const regressive = projections.filter((item) => item.after.score < item.before.score);
    if (regressive.length) throw new Error(`MSE-25.92: projection régressive: ${JSON.stringify(regressive)}`);

    const snapshots = [], changes = [];
    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const plan of plans) {
          if (plan.role === "services") {
            const block = bodyBlock(plan.page), content = contentOf(block), key = textKey(content), sentence = servicesSentence(plan.city);
            if (normalize(content[key]).includes(normalize(sentence))) continue;
            snapshots.push({ city: plan.city, role: plan.role, pageId: plan.page.id, blockId: block.id, content: clone(content) });
            await tx.pageBlock.update({ where: { id: block.id }, data: { content: { ...content, [key]: `${String(content[key]).trim()} ${sentence}`.trim() } } });
            changes.push({ city: plan.city, role: plan.role, pageId: plan.page.id, slug: plan.page.slug, blockId: block.id, textKey: key });
          } else {
            const desired = contactSeo(plan.city), heading = headingBlock(plan.page), headingContent = contentOf(heading), key = headingKey(headingContent), pageData = {};
            if (plan.page.seoTitle !== desired.seoTitle) pageData.seoTitle = desired.seoTitle;
            if (plan.page.metaDescription !== desired.metaDescription) pageData.metaDescription = desired.metaDescription;
            snapshots.push({ city: plan.city, role: plan.role, pageId: plan.page.id, seoTitle: plan.page.seoTitle || null, metaDescription: plan.page.metaDescription || null, blockId: heading.id, content: clone(headingContent) });
            if (Object.keys(pageData).length) await tx.agencySitePage.update({ where: { id: plan.page.id }, data: pageData });
            if (headingContent[key] !== desired.h1) await tx.pageBlock.update({ where: { id: heading.id }, data: { content: { ...headingContent, [key]: desired.h1 } } });
            const body = bodyBlock(plan.page);
            if (body) {
              const content = contentOf(body), bodyKey = textKey(content), sentence = contactSentence(plan.city);
              if (!normalize(content[bodyKey]).includes(normalize(sentence))) await tx.pageBlock.update({ where: { id: body.id }, data: { content: { ...content, [bodyKey]: `${String(content[bodyKey]).trim()} ${sentence}`.trim() } } });
            }
            changes.push({ city: plan.city, role: plan.role, pageId: plan.page.id, slug: plan.page.slug, headingBlockId: heading.id, bodyEnriched: Boolean(body), pageFields: Object.keys(pageData) });
          }
        }
      });
    }

    const freshSites = dryRun ? sites : await loadSites(prisma, tenant.id);
    const afterPersist = plans.map((plan) => { const site = freshSites.find((item) => normalize(item?.agency?.city) === normalize(plan.city)); const page = pageBySlug(site, plan.role === "services" ? "services" : "contact"); return { city: plan.city, role: plan.role, score: score(page, plan.city, plan.intentKey) }; });
    const report = { mse: "25.92", tenantSlug, dryRun, writes: !dryRun, targetSites: TARGET_CITIES.length, actions: plans.length, serviceActions: SERVICE_CITIES.length, contactActions: CONTACT_CITIES.length, frontendFilesTouched: 0, heroBodyTextTouched: 0, pageCreationCount: 0, projections, changes, snapshots, afterPersist };
    fs.mkdirSync(reportDir, { recursive: true });
    const file = path.join(reportDir, `mse-25-92-${dryRun ? "preview" : "apply"}-${timestamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, snapshots: undefined, reportFile: file }, null, 2));
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exit(1); });
