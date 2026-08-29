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
function bodyBlock(page) {
  return (page?.blocks || []).find((block) => !isHero(block) && textKey(contentOf(block))) || null;
}
function pageBySlug(site, slug) { return (site?.pages || []).find((page) => normalize(page?.slug) === normalize(slug)) || null; }
function intent(key) { return INTENTS.find((item) => item.key === key); }
function score(page, city, key) {
  const result = qualityForTarget(page, city, intent(key));
  return { score: result.score, status: result.status };
}

function servicesSentence(city) {
  return `Pour vos billets d’avion au départ ou à destination de ${city}, notre agence vous accompagne dans la recherche de vols, le choix des horaires et des conditions tarifaires, avec un interlocuteur pour le suivi de votre dossier.`;
}
function contactSentence(city) {
  return `Pour préparer votre voyage à ${city}, contactez directement notre agence pour échanger avec un conseiller, convenir d’un rendez-vous et bénéficier d’un accompagnement personnalisé pour votre projet.`;
}

function projectedPage(page, sentence) {
  const projected = clone(page);
  const block = bodyBlock(projected);
  if (!block) return projected;
  const content = contentOf(block);
  const key = textKey(content);
  if (!normalize(content[key]).includes(normalize(sentence))) {
    block.content = { ...content, [key]: `${String(content[key]).trim()} ${sentence}`.trim() };
  }
  return projected;
}

async function loadSites(prisma, tenantId) {
  return prisma.agencySite.findMany({
    where: { tenantId },
    include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } },
  });
}

function buildPlans(sites) {
  const plans = [];
  for (const city of TARGET_CITIES) {
    const site = sites.find((item) => normalize(item?.agency?.city) === normalize(city));
    if (!site) throw new Error(`MSE-25.92: mini-site introuvable pour ${city}`);
    if (SERVICE_CITIES.includes(city)) {
      const page = pageBySlug(site, "services");
      if (!page || !bodyBlock(page)) throw new Error(`MSE-25.92: texte existant /services introuvable pour ${city}`);
      plans.push({ city, role: "services", intentKey: "ticketing", page, sentence: servicesSentence(city) });
    }
    if (CONTACT_CITIES.includes(city)) {
      const page = pageBySlug(site, "contact");
      if (!page || !bodyBlock(page)) throw new Error(`MSE-25.92: texte existant /contact introuvable pour ${city}`);
      plans.push({ city, role: "contact", intentKey: "appointment", page, sentence: contactSentence(city) });
    }
  }
  return plans;
}

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

    const projections = plans.map((plan) => ({
      city: plan.city,
      role: plan.role,
      slug: plan.page.slug,
      before: score(plan.page, plan.city, plan.intentKey),
      after: score(projectedPage(plan.page, plan.sentence), plan.city, plan.intentKey),
    }));
    const regressive = projections.filter((item) => item.after.score < item.before.score);
    if (regressive.length) throw new Error(`MSE-25.92: projection régressive: ${JSON.stringify(regressive)}`);

    const snapshots = [];
    const changes = [];
    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const plan of plans) {
          const block = bodyBlock(plan.page);
          const content = contentOf(block);
          const key = textKey(content);
          if (normalize(content[key]).includes(normalize(plan.sentence))) continue;
          snapshots.push({ city: plan.city, role: plan.role, pageId: plan.page.id, blockId: block.id, content: clone(content) });
          const nextContent = { ...content, [key]: `${String(content[key]).trim()} ${plan.sentence}`.trim() };
          await tx.pageBlock.update({ where: { id: block.id }, data: { content: nextContent } });
          changes.push({ city: plan.city, role: plan.role, pageId: plan.page.id, slug: plan.page.slug, blockId: block.id, textKey: key });
        }
      });
    }

    const freshSites = dryRun ? sites : await loadSites(prisma, tenant.id);
    const afterPersist = plans.map((plan) => {
      const site = freshSites.find((item) => normalize(item?.agency?.city) === normalize(plan.city));
      const page = pageBySlug(site, plan.role === "services" ? "services" : "contact");
      return { city: plan.city, role: plan.role, score: score(page, plan.city, plan.intentKey) };
    });

    const report = {
      mse: "25.92",
      tenantSlug,
      dryRun,
      writes: !dryRun,
      targetSites: TARGET_CITIES.length,
      actions: plans.length,
      serviceActions: SERVICE_CITIES.length,
      contactActions: CONTACT_CITIES.length,
      frontendFilesTouched: 0,
      heroBodyTextTouched: 0,
      pageCreationCount: 0,
      projections,
      changes,
      snapshots,
      afterPersist,
    };
    fs.mkdirSync(reportDir, { recursive: true });
    const file = path.join(reportDir, `mse-25-92-${dryRun ? "preview" : "apply"}-${timestamp()}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, snapshots: undefined, reportFile: file }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
