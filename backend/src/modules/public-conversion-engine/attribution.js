"use strict";

const { Prisma } = require("@prisma/client");

const COMMERCIAL_ACTIONS = new Set([
  "quote_request", "contact", "phone", "email", "appointment", "advisor_contact",
]);
const MIN_JOURNEYS_FOR_SIGNAL = 5;

function normalizeJourneyId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-f0-9-]{20,64}$/.test(id) ? id : null;
}

function clean(value, max = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function normalizePath(value) {
  const raw = String(value || "").trim();
  return raw.startsWith("/") ? raw.split(/[?#]/, 1)[0].slice(0, 320) : null;
}

function validateJourneyInput(input = {}, { siteSlug, now = new Date() } = {}) {
  const journeyId = normalizeJourneyId(input.journeyId);
  if (!journeyId) {
    const error = new Error("Identifiant de parcours invalide.");
    error.code = "PUBLIC_JOURNEY_ID_INVALID";
    error.statusCode = 400;
    throw error;
  }
  const action = clean(input.action, 80);
  const pageSlug = clean(input.pageSlug, 80) || "home";
  if (!action) {
    const error = new Error("Action de parcours obligatoire.");
    error.code = "PUBLIC_JOURNEY_ACTION_REQUIRED";
    error.statusCode = 400;
    throw error;
  }
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : now;
  const boundedAt = Number.isNaN(occurredAt.getTime()) || Math.abs(now.getTime() - occurredAt.getTime()) > 86400000
    ? now
    : occurredAt;
  return {
    journeyId,
    siteSlug: clean(siteSlug, 120),
    pageSlug,
    pagePath: normalizePath(input.pagePath) || `/agence/${encodeURIComponent(siteSlug)}`,
    action,
    intent: clean(input.intent, 80) || "general_travel",
    placement: clean(input.placement, 120) || "public-site-page",
    referrerPath: normalizePath(input.referrerPath),
    occurredAt: boundedAt,
  };
}

function percent(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : null;
}

function buildJourneySummary(events = []) {
  const journeys = new Map();
  for (const event of events) {
    const id = String(event.journeyId || "");
    if (!id) continue;
    const journey = journeys.get(id) || { journeyId: id, siteSlug: event.siteSlug, steps: [] };
    journey.steps.push(event);
    journeys.set(id, journey);
  }

  const pathCounts = new Map();
  const pageStats = new Map();
  const transitionStats = new Map();
  let commercialJourneys = 0;
  let multiStepJourneys = 0;
  let totalSteps = 0;

  for (const journey of journeys.values()) {
    journey.steps.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
    totalSteps += journey.steps.length;
    const isMultiStep = journey.steps.length > 1;
    const isCommercial = journey.steps.some((step) => COMMERCIAL_ACTIONS.has(step.action));
    if (isMultiStep) multiStepJourneys += 1;
    if (isCommercial) commercialJourneys += 1;

    const compact = [];
    for (const step of journey.steps) {
      const token = `${step.pageSlug}:${step.action}`;
      if (compact[compact.length - 1] !== token) compact.push(token);
    }

    const uniquePages = [...new Set(journey.steps.map((step) => step.pageSlug).filter(Boolean))];
    for (const pageSlug of uniquePages) {
      const stat = pageStats.get(pageSlug) || { pageSlug, journeys: 0, commercialJourneys: 0, terminalJourneys: 0 };
      stat.journeys += 1;
      if (isCommercial) stat.commercialJourneys += 1;
      if (journey.steps[journey.steps.length - 1]?.pageSlug === pageSlug && !isCommercial) stat.terminalJourneys += 1;
      pageStats.set(pageSlug, stat);
    }

    const transitionKeys = new Set();
    for (let index = 0; index < journey.steps.length - 1; index += 1) {
      const from = journey.steps[index]?.pageSlug;
      const to = journey.steps[index + 1]?.pageSlug;
      if (!from || !to || from === to) continue;
      transitionKeys.add(`${from} → ${to}`);
    }
    for (const key of transitionKeys) {
      const stat = transitionStats.get(key) || { transition: key, journeys: 0, commercialJourneys: 0 };
      stat.journeys += 1;
      if (isCommercial) stat.commercialJourneys += 1;
      transitionStats.set(key, stat);
    }

    const signature = compact.slice(-8).join(" → ");
    if (signature) {
      const current = pathCounts.get(signature) || {
        path: signature,
        journeys: 0,
        commercial: false,
        multiStep: false,
        steps: compact.length,
      };
      current.journeys += 1;
      current.commercial = current.commercial || isCommercial;
      current.multiStep = current.multiStep || isMultiStep;
      current.steps = Math.max(current.steps, compact.length);
      pathCounts.set(signature, current);
    }
  }

  const topPaths = [...pathCounts.values()]
    .sort((a, b) => b.journeys - a.journeys || Number(b.commercial) - Number(a.commercial) || Number(b.multiStep) - Number(a.multiStep) || b.steps - a.steps || a.path.localeCompare(b.path))
    .slice(0, 20)
    .map(({ path, journeys: count }) => ({ path, journeys: count }));

  const pageIntelligence = [...pageStats.values()]
    .map((item) => ({
      ...item,
      commercialRate: percent(item.commercialJourneys, item.journeys),
      terminalRate: percent(item.terminalJourneys, item.journeys),
      evidence: item.journeys >= MIN_JOURNEYS_FOR_SIGNAL ? "usable" : "insufficient",
    }))
    .sort((a, b) => b.journeys - a.journeys || a.pageSlug.localeCompare(b.pageSlug));

  const transitions = [...transitionStats.values()]
    .map((item) => ({
      ...item,
      commercialRate: percent(item.commercialJourneys, item.journeys),
      evidence: item.journeys >= MIN_JOURNEYS_FOR_SIGNAL ? "usable" : "insufficient",
    }))
    .sort((a, b) => b.journeys - a.journeys || b.commercialJourneys - a.commercialJourneys || a.transition.localeCompare(b.transition));

  const strengths = transitions
    .filter((item) => item.evidence === "usable" && item.commercialRate >= 50)
    .slice(0, 15)
    .map((item) => ({ ...item, recommendation: "Préserver ce passage : il accompagne fréquemment un parcours qui atteint une action commerciale." }));

  const frictionPoints = pageIntelligence
    .filter((item) => item.evidence === "usable" && item.terminalRate >= 40 && item.commercialRate < 35)
    .sort((a, b) => b.terminalRate - a.terminalRate || a.commercialRate - b.commercialRate)
    .slice(0, 15)
    .map((item) => ({ ...item, recommendation: "Investiguer cette page comme point de rupture potentiel avant toute modification : vérifier lisibilité, continuité et accès au contact." }));

  return {
    journeyCount: journeys.size,
    multiStepJourneyCount: multiStepJourneys,
    commercialJourneyCount: commercialJourneys,
    commercialJourneyRate: percent(commercialJourneys, journeys.size),
    averageSteps: journeys.size ? Number((totalSteps / journeys.size).toFixed(2)) : null,
    topPaths,
    intelligence: {
      mode: "read-only-recommendations",
      evidenceGate: `${MIN_JOURNEYS_FOR_SIGNAL}-journeys`,
      pageIntelligence,
      transitions,
      strengths,
      frictionPoints,
    },
  };
}

class PublicJourneyAttributionService {
  constructor(database) { this.database = database; }

  async ingest({ tenantId, site, input, now = new Date() }) {
    const event = validateJourneyInput(input, { siteSlug: site.slug, now });
    const rows = await this.database.$queryRaw(Prisma.sql`
      INSERT INTO "PublicConversionJourneyEvent" (
        "tenantId", "siteId", "agencyId", "siteSlug", "journeyId", "pageSlug", "pagePath",
        "intent", "action", "placement", "referrerPath", "occurredAt"
      ) VALUES (
        ${tenantId}, ${site.id}, ${site.agencyId}, ${site.slug}, ${event.journeyId}, ${event.pageSlug}, ${event.pagePath},
        ${event.intent}, ${event.action}, ${event.placement}, ${event.referrerPath}, ${event.occurredAt}
      ) RETURNING "id", "occurredAt"
    `);
    return { accepted: true, id: String(rows?.[0]?.id || ""), occurredAt: rows?.[0]?.occurredAt || event.occurredAt };
  }

  async summary({ tenantId, siteSlug = null, days = 30, now = new Date() }) {
    const boundedDays = Math.min(Math.max(Number(days) || 30, 1), 90);
    const from = new Date(now.getTime() - boundedDays * 86400000);
    const slug = String(siteSlug || "").trim() || null;
    const events = await this.database.$queryRaw(Prisma.sql`
      SELECT "journeyId", "siteSlug", "pageSlug", "pagePath", "intent", "action", "placement", "referrerPath", "occurredAt"
      FROM "PublicConversionJourneyEvent"
      WHERE "tenantId" = ${tenantId}
        AND "occurredAt" >= ${from}
        AND (${slug}::text IS NULL OR "siteSlug" = ${slug})
      ORDER BY "journeyId", "occurredAt" ASC
      LIMIT 20000
    `);
    return { days: boundedDays, siteSlug: slug, ...buildJourneySummary(events) };
  }
}

module.exports = {
  COMMERCIAL_ACTIONS,
  MIN_JOURNEYS_FOR_SIGNAL,
  PublicJourneyAttributionService,
  buildJourneySummary,
  normalizeJourneyId,
  validateJourneyInput,
};
