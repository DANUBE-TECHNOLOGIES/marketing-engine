"use strict";

const crypto = require("crypto");
const { TEMPLATE_DEFINITIONS } = require("./templates");

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function sentence(value) { const text = clean(value); return text && !/[.!?]$/.test(text) ? `${text}.` : text; }
function money(value) { return Number.isFinite(Number(value)) ? `${Math.round(Number(value))} €` : null; }
function monthLabel(month) { return MONTHS[Number(month) - 1] || null; }
function namedRelations(items, key) { return list(items).map((item) => item?.[key] || item).filter(Boolean); }

function buildContext(destination, site = null) {
  const knowledge = destination.knowledge || {};
  const country = destination.countryRef?.name || destination.country || "";
  const region = destination.regionRef?.name || destination.region || "";
  const agency = site?.agency || {};
  return {
    name: clean(destination.name),
    slug: clean(destination.slug),
    country: clean(country),
    region: clean(region),
    agencyName: clean(agency.name || site?.name || "votre agence Mondescale"),
    siteSlug: clean(site?.slug),
    phone: clean(agency.phone),
    email: clean(agency.email),
    knowledge,
    themes: namedRelations(destination.themes, "theme"),
    travelTypes: namedRelations(destination.travelTypes, "travelType"),
    tags: namedRelations(destination.tags, "tag"),
    climate: list(destination.climateMonths),
    profile: destination.travelProfile || {},
    budget: destination.budgetProfile || {},
  };
}

function buildHero(ctx) {
  return {
    type: "hero",
    title: `Voyage à ${ctx.name}`,
    eyebrow: ctx.country || ctx.region || "Destination",
    text: sentence(ctx.knowledge.shortDescription || `Préparez votre séjour à ${ctx.name} avec les conseils de ${ctx.agencyName}`),
    primaryCta: { label: "Demander un devis", href: `${ctx.siteSlug ? `/agence/${ctx.siteSlug}` : ""}/contact` },
  };
}

function buildIntroduction(ctx) {
  const angle = ctx.themes.slice(0, 3).map((item) => clean(item.name)).filter(Boolean).join(", ");
  const text = ctx.knowledge.description || ctx.knowledge.shortDescription ||
    `${ctx.name}${ctx.country ? `, en ${ctx.country}` : ""}, se découvre${angle ? ` autour de ${angle}` : " selon vos envies"}.`;
  return { type: "introduction", title: `Découvrir ${ctx.name}`, paragraphs: [sentence(text)] };
}

function buildBestTime(ctx) {
  const months = list(ctx.knowledge.bestMonths).map(monthLabel).filter(Boolean);
  const climateRanked = ctx.climate
    .filter((item) => item.month && (item.comfortScore || item.sunshineHours || item.rainDays !== null))
    .sort((a, b) => (Number(b.comfortScore) || 0) - (Number(a.comfortScore) || 0));
  const inferred = climateRanked.slice(0, 4).map((item) => monthLabel(item.month)).filter(Boolean);
  const selected = months.length ? months : inferred;
  if (!selected.length && !ctx.knowledge.bestTime) return null;
  return {
    type: "best-time",
    title: `Quand partir à ${ctx.name} ?`,
    summary: sentence(ctx.knowledge.bestTime || `Les périodes les plus favorables sont ${selected.join(", ")}`),
    months: selected,
    idealDurationDays: ctx.knowledge.idealDurationDays || null,
  };
}

function buildMustSee(ctx) {
  const highlights = list(ctx.knowledge.highlights || ctx.knowledge.mustSee)
    .map((item) => typeof item === "string" ? { title: clean(item) } : { title: clean(item.title), text: clean(item.text) })
    .filter((item) => item.title);
  if (!highlights.length) return null;
  return { type: "must-see", title: `Les incontournables de ${ctx.name}`, items: highlights.slice(0, 10) };
}

function buildTravelProfile(ctx) {
  const labels = {
    familyScore: "Famille", coupleScore: "Couple", cultureScore: "Culture", luxuryScore: "Luxe",
    beachScore: "Plage", natureScore: "Nature", adventureScore: "Aventure",
  };
  const items = Object.entries(labels)
    .map(([key, label]) => ({ label, score: clamp(ctx.profile[key], 0, 100) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!items.length && !ctx.travelTypes.length) return null;
  return {
    type: "travel-profile",
    title: `À qui s'adresse ${ctx.name} ?`,
    items: items.slice(0, 6),
    travelTypes: ctx.travelTypes.slice(0, 6).map((item) => clean(item.name)).filter(Boolean),
  };
}

function buildBudget(ctx) {
  const tiers = [
    ["Économique", ctx.budget.dailyBudgetLow],
    ["Confort", ctx.budget.dailyBudgetMid],
    ["Premium", ctx.budget.dailyBudgetHigh],
  ].map(([label, value]) => ({ label, amountPerDay: money(value) })).filter((item) => item.amountPerDay);
  if (!tiers.length && !ctx.budget.flightBudgetLow && !ctx.budget.flightBudgetHigh) return null;
  return {
    type: "budget",
    title: `Quel budget prévoir pour ${ctx.name} ?`,
    currency: ctx.knowledge.currencyCode || "EUR",
    tiers,
    flightRange: [money(ctx.budget.flightBudgetLow), money(ctx.budget.flightBudgetHigh)].filter(Boolean),
    accommodationRange: [money(ctx.budget.hotelBudgetLow), money(ctx.budget.hotelBudgetHigh)].filter(Boolean),
  };
}

function buildPracticalInfo(ctx) {
  const items = [
    ["Monnaie", ctx.knowledge.currencyName || ctx.knowledge.currencyCode],
    ["Langues", list(ctx.knowledge.languages).join(", ")],
    ["Fuseau horaire", ctx.knowledge.timezone],
    ["Durée de vol", ctx.knowledge.flightDurationMinutes ? `${Math.floor(ctx.knowledge.flightDurationMinutes / 60)} h ${ctx.knowledge.flightDurationMinutes % 60 || ""}`.trim() : null],
    ["Formalités", ctx.knowledge.entryRequirements],
    ["Santé", ctx.knowledge.healthAdvice],
    ["Sécurité", ctx.knowledge.safetyAdvice],
  ].map(([label, value]) => ({ label, value: clean(value) })).filter((item) => item.value);
  if (!items.length) return null;
  return { type: "practical-info", title: `Informations pratiques pour ${ctx.name}`, items };
}

function buildClimate(ctx) {
  if (!ctx.climate.length) return null;
  return {
    type: "climate",
    title: `Climat à ${ctx.name}`,
    months: ctx.climate.map((item) => ({
      month: item.month,
      label: monthLabel(item.month),
      minC: item.minTempC ?? null,
      maxC: item.maxTempC ?? null,
      rainDays: item.rainDays ?? null,
      sunshineHours: item.sunshineHours ?? null,
      seaTempC: item.seaTempC ?? null,
    })),
  };
}

function buildFaq(ctx) {
  const questions = [];
  if (ctx.knowledge.bestTime || list(ctx.knowledge.bestMonths).length) questions.push({ question: `Quelle est la meilleure période pour partir à ${ctx.name} ?`, answer: sentence(ctx.knowledge.bestTime || `Privilégiez ${list(ctx.knowledge.bestMonths).map(monthLabel).filter(Boolean).join(", ")}`) });
  if (ctx.knowledge.idealDurationDays) questions.push({ question: `Combien de jours prévoir à ${ctx.name} ?`, answer: `Une durée d'environ ${ctx.knowledge.idealDurationDays} jours permet de profiter pleinement de la destination.` });
  if (ctx.knowledge.flightDurationMinutes) questions.push({ question: `Combien de temps dure le vol pour ${ctx.name} ?`, answer: `Comptez environ ${Math.round(ctx.knowledge.flightDurationMinutes / 60 * 10) / 10} heures de vol, selon l'itinéraire.` });
  if (ctx.knowledge.entryRequirements) questions.push({ question: `Quelles formalités prévoir pour ${ctx.name} ?`, answer: sentence(ctx.knowledge.entryRequirements) });
  if (!questions.length) return null;
  return { type: "faq", title: `Questions fréquentes sur ${ctx.name}`, items: questions.slice(0, 8) };
}

function buildRecommendations(ctx, recommendations) {
  const items = list(recommendations).map((item) => ({
    title: clean(item.name || item.title),
    slug: clean(item.slug),
    score: Number(item.score) || null,
    reasons: list(item.reasons).map(clean).filter(Boolean),
    href: ctx.siteSlug && item.slug ? `/agence/${ctx.siteSlug}/destination/${item.slug}` : null,
  })).filter((item) => item.title && item.slug);
  if (!items.length) return null;
  return { type: "recommendations", title: "Vous aimerez aussi", items: items.slice(0, 8) };
}

function buildContact(ctx) {
  const actions = [{ label: "Demander un devis", href: `${ctx.siteSlug ? `/agence/${ctx.siteSlug}` : ""}/contact` }];
  if (ctx.phone) actions.push({ label: "Appeler l'agence", href: `tel:${ctx.phone.replace(/\s+/g, "")}` });
  if (ctx.email) actions.push({ label: "Écrire à l'agence", href: `mailto:${ctx.email}` });
  return { type: "contact-cta", title: `Construisons votre voyage à ${ctx.name}`, text: `Échangez avec ${ctx.agencyName} pour une proposition personnalisée.`, actions };
}

const BUILDERS = {
  hero: buildHero,
  introduction: buildIntroduction,
  "best-time": buildBestTime,
  "must-see": buildMustSee,
  "travel-profile": buildTravelProfile,
  budget: buildBudget,
  "practical-info": buildPracticalInfo,
  climate: buildClimate,
  faq: buildFaq,
  recommendations: (ctx, input) => buildRecommendations(ctx, input.recommendations),
  "contact-cta": buildContact,
};

function composeDestinationContent({ destination, site = null, recommendations = [], template = "destination", status = "draft" }) {
  if (!destination?.name || !destination?.slug) {
    const error = new Error("Une destination avec name et slug est requise.");
    error.status = 400;
    error.code = "CONTENT_ENGINE_VALIDATION_ERROR";
    throw error;
  }
  const definition = TEMPLATE_DEFINITIONS[template];
  if (!definition) {
    const error = new Error(`Template inconnu : ${template}`);
    error.status = 400;
    error.code = "CONTENT_ENGINE_TEMPLATE_NOT_FOUND";
    throw error;
  }
  const ctx = buildContext(destination, site);
  const sections = definition.sections
    .map((type) => BUILDERS[type]?.(ctx, { recommendations }))
    .filter(Boolean)
    .map((section, index) => ({ ...section, displayOrder: index, status }));
  const payload = {
    schemaVersion: "1.0",
    engineVersion: "1.0.0",
    template,
    destination: { id: destination.id || null, slug: ctx.slug, name: ctx.name },
    seo: {
      title: clean(destination.seoTitle || `Voyage à ${ctx.name}${ctx.country ? ` (${ctx.country})` : ""} avec ${ctx.agencyName}`).slice(0, 70),
      description: sentence(destination.seoDescription || ctx.knowledge.shortDescription || `Découvrez ${ctx.name} et préparez votre voyage avec ${ctx.agencyName}`).slice(0, 180),
      canonicalPath: `${ctx.siteSlug ? `/agence/${ctx.siteSlug}` : ""}/destination/${ctx.slug}`,
      schemaType: "TouristDestination",
    },
    sections,
    quality: {
      score: Math.round((sections.length / definition.sections.length) * 100),
      availableSections: sections.length,
      expectedSections: definition.sections.length,
      missingSections: definition.sections.filter((type) => !sections.some((section) => section.type === type)),
    },
  };
  payload.contentHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return payload;
}

module.exports = { buildContext, composeDestinationContent };
