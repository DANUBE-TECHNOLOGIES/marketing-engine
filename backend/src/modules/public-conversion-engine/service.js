"use strict";

const { Prisma } = require("@prisma/client");
const { validateConversionInput } = require("./contract");

async function resolveTenant(database, request) {
  const directId = String(request?.tenant?.id || request?.tenantId || request?.get?.("x-tenant-id") || "").trim();
  if (directId) return { id: directId, slug: request?.tenant?.slug || null };
  const slug = String(request?.tenant?.slug || request?.tenantSlug || request?.get?.("x-tenant-slug") || "").trim();
  if (!slug) {
    const error = new Error("Tenant public obligatoire.");
    error.code = "PUBLIC_CONVERSION_TENANT_REQUIRED";
    error.statusCode = 400;
    throw error;
  }
  const tenant = await database.tenant.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!tenant) {
    const error = new Error("Tenant public introuvable.");
    error.code = "PUBLIC_CONVERSION_TENANT_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }
  return tenant;
}

async function resolveSite(database, tenantId, siteSlug) {
  const slug = String(siteSlug || "").trim();
  if (!slug) {
    const error = new Error("Mini-site obligatoire.");
    error.code = "PUBLIC_CONVERSION_SITE_REQUIRED";
    error.statusCode = 400;
    throw error;
  }
  const site = await database.agencySite.findFirst({
    where: { tenantId, slug, status: "published" },
    select: { id: true, agencyId: true, slug: true },
  });
  if (!site) {
    const error = new Error("Mini-site public introuvable.");
    error.code = "PUBLIC_CONVERSION_SITE_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }
  return site;
}

function buildFunnel(rows = []) {
  const byPage = new Map();
  let pageViews = 0;
  let conversionEvents = 0;

  for (const row of rows) {
    const events = Number(row.events || 0);
    const isView = row.action === "page_view";
    if (isView) pageViews += events;
    else conversionEvents += events;

    const key = `${row.siteSlug}:${row.pageSlug}`;
    const current = byPage.get(key) || {
      siteSlug: row.siteSlug,
      pageSlug: row.pageSlug,
      pageViews: 0,
      conversionEvents: 0,
      conversionRate: null,
    };
    if (isView) current.pageViews += events;
    else current.conversionEvents += events;
    byPage.set(key, current);
  }

  const pages = [...byPage.values()].map((item) => ({
    ...item,
    conversionRate: item.pageViews > 0
      ? Number(((item.conversionEvents / item.pageViews) * 100).toFixed(2))
      : null,
  })).sort((a, b) => b.conversionEvents - a.conversionEvents || b.pageViews - a.pageViews);

  return {
    pageViews,
    conversionEvents,
    conversionRate: pageViews > 0
      ? Number(((conversionEvents / pageViews) * 100).toFixed(2))
      : null,
    pages,
  };
}

function confidenceForViews(pageViews) {
  const views = Number(pageViews || 0);
  if (views >= 100) return "strong";
  if (views >= 40) return "usable";
  return "insufficient";
}

function buildBenchmarks(pages = []) {
  const groups = new Map();
  for (const page of pages) {
    if (Number(page.pageViews || 0) < 40 || page.conversionRate == null) continue;
    const list = groups.get(page.pageSlug) || [];
    list.push(Number(page.conversionRate));
    groups.set(page.pageSlug, list);
  }

  const benchmarks = {};
  for (const [pageSlug, rates] of groups.entries()) {
    const sorted = [...rates].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
    benchmarks[pageSlug] = {
      sampleSize: sorted.length,
      medianRate: Number(median.toFixed(2)),
      bestRate: Number(sorted[sorted.length - 1].toFixed(2)),
    };
  }
  return benchmarks;
}

function buildOptimizationInsights(rows = [], pages = []) {
  const benchmarks = buildBenchmarks(pages);
  const actionsByPage = new Map();

  for (const row of rows) {
    if (row.action === "page_view") continue;
    const key = `${row.siteSlug}:${row.pageSlug}`;
    const actions = actionsByPage.get(key) || new Set();
    actions.add(row.action);
    actionsByPage.set(key, actions);
  }

  const opportunities = [];
  const strengths = [];

  for (const page of pages) {
    const views = Number(page.pageViews || 0);
    const conversions = Number(page.conversionEvents || 0);
    const rate = page.conversionRate == null ? null : Number(page.conversionRate);
    const confidence = confidenceForViews(views);
    const benchmark = benchmarks[page.pageSlug] || null;
    const key = `${page.siteSlug}:${page.pageSlug}`;
    const actions = actionsByPage.get(key) || new Set();

    if (views >= 75 && conversions === 0) {
      opportunities.push({
        siteSlug: page.siteSlug,
        pageSlug: page.pageSlug,
        priority: "critical",
        kind: "high-traffic-zero-conversion",
        confidence,
        pageViews: views,
        conversionEvents: conversions,
        conversionRate: rate,
        benchmarkRate: benchmark?.medianRate ?? null,
        recommendation: "Revoir le CTA principal, sa visibilité et la proposition de valeur de cette page.",
      });
      continue;
    }

    if (
      views >= 75 &&
      benchmark?.sampleSize >= 2 &&
      rate != null &&
      benchmark.medianRate > 0 &&
      rate < benchmark.medianRate * 0.6
    ) {
      opportunities.push({
        siteSlug: page.siteSlug,
        pageSlug: page.pageSlug,
        priority: "high",
        kind: "below-network-benchmark",
        confidence,
        pageViews: views,
        conversionEvents: conversions,
        conversionRate: rate,
        benchmarkRate: benchmark.medianRate,
        recommendation: "Comparer cette page aux agences les plus performantes et tester un CTA, un ordre de blocs ou un message plus direct.",
      });
    }

    if (
      views >= 75 &&
      !["contact", "equipe", "team"].includes(page.pageSlug) &&
      !actions.has("contact") &&
      !actions.has("phone") &&
      !actions.has("quote_request") &&
      !actions.has("advisor_contact")
    ) {
      opportunities.push({
        siteSlug: page.siteSlug,
        pageSlug: page.pageSlug,
        priority: "medium",
        kind: "missing-commercial-action",
        confidence,
        pageViews: views,
        conversionEvents: conversions,
        conversionRate: rate,
        benchmarkRate: benchmark?.medianRate ?? null,
        recommendation: "Renforcer le chemin vers un devis, un appel ou un conseiller sans alourdir la page.",
      });
    }

    if (
      views >= 75 &&
      benchmark?.sampleSize >= 2 &&
      rate != null &&
      benchmark.medianRate > 0 &&
      rate >= benchmark.medianRate * 1.4
    ) {
      strengths.push({
        siteSlug: page.siteSlug,
        pageSlug: page.pageSlug,
        confidence,
        pageViews: views,
        conversionRate: rate,
        benchmarkRate: benchmark.medianRate,
        recommendation: "Conserver cette composition comme référence et étudier sa réplication sur les pages comparables.",
      });
    }
  }

  const rank = { critical: 0, high: 1, medium: 2 };
  opportunities.sort((a, b) =>
    (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) ||
    b.pageViews - a.pageViews ||
    String(a.siteSlug).localeCompare(String(b.siteSlug))
  );
  strengths.sort((a, b) => b.conversionRate - a.conversionRate || b.pageViews - a.pageViews);

  return {
    benchmarks,
    opportunityCount: opportunities.length,
    strongEvidencePageCount: pages.filter((page) => confidenceForViews(page.pageViews) === "strong").length,
    usableEvidencePageCount: pages.filter((page) => confidenceForViews(page.pageViews) !== "insufficient").length,
    opportunities,
    strengths,
  };
}

function percentDelta(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue === 0 ? 0 : null;
  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2));
}

function buildNetworkRankings(pages = []) {
  const groups = new Map();
  for (const page of pages) {
    if (Number(page.pageViews || 0) < 40 || page.conversionRate == null) continue;
    const list = groups.get(page.pageSlug) || [];
    list.push(page);
    groups.set(page.pageSlug, list);
  }

  const rankings = [];
  for (const [pageSlug, group] of groups.entries()) {
    const sorted = [...group].sort((a, b) =>
      Number(b.conversionRate || 0) - Number(a.conversionRate || 0) ||
      Number(b.pageViews || 0) - Number(a.pageViews || 0) ||
      String(a.siteSlug).localeCompare(String(b.siteSlug))
    );
    sorted.forEach((page, index) => {
      rankings.push({
        siteSlug: page.siteSlug,
        pageSlug,
        pageViews: Number(page.pageViews || 0),
        conversionRate: Number(page.conversionRate || 0),
        rank: index + 1,
        peerCount: sorted.length,
        percentile: sorted.length > 1
          ? Number((((sorted.length - 1 - index) / (sorted.length - 1)) * 100).toFixed(1))
          : 100,
      });
    });
  }
  return rankings.sort((a, b) => a.pageSlug.localeCompare(b.pageSlug) || a.rank - b.rank);
}

function buildTemporalComparison(currentPages = [], previousPages = []) {
  const previousByKey = new Map(
    previousPages.map((page) => [`${page.siteSlug}:${page.pageSlug}`, page])
  );
  const comparisons = [];

  for (const current of currentPages) {
    const key = `${current.siteSlug}:${current.pageSlug}`;
    const previous = previousByKey.get(key);
    if (!previous) continue;

    const currentViews = Number(current.pageViews || 0);
    const previousViews = Number(previous.pageViews || 0);
    const currentRate = current.conversionRate == null ? null : Number(current.conversionRate);
    const previousRate = previous.conversionRate == null ? null : Number(previous.conversionRate);
    const comparable = currentViews >= 40 && previousViews >= 40 && currentRate != null && previousRate != null;
    const rateDeltaPoints = comparable ? Number((currentRate - previousRate).toFixed(2)) : null;
    const relativeRateDelta = comparable ? percentDelta(currentRate, previousRate) : null;
    const viewDeltaPercent = percentDelta(currentViews, previousViews);

    let trend = "insufficient";
    if (comparable) {
      const meaningfulAbsolute = Math.abs(rateDeltaPoints) >= 2;
      const meaningfulRelative = relativeRateDelta == null || Math.abs(relativeRateDelta) >= 20;
      if (meaningfulAbsolute && meaningfulRelative) {
        trend = rateDeltaPoints > 0 ? "improving" : "degrading";
      } else {
        trend = "stable";
      }
    }

    comparisons.push({
      siteSlug: current.siteSlug,
      pageSlug: current.pageSlug,
      currentPageViews: currentViews,
      previousPageViews: previousViews,
      currentConversionEvents: Number(current.conversionEvents || 0),
      previousConversionEvents: Number(previous.conversionEvents || 0),
      currentConversionRate: currentRate,
      previousConversionRate: previousRate,
      rateDeltaPoints,
      relativeRateDelta,
      viewDeltaPercent,
      confidence: confidenceForViews(Math.min(currentViews, previousViews)),
      comparable,
      trend,
    });
  }

  comparisons.sort((a, b) => {
    const order = { degrading: 0, improving: 1, stable: 2, insufficient: 3 };
    return (order[a.trend] ?? 9) - (order[b.trend] ?? 9) ||
      Math.abs(Number(b.rateDeltaPoints || 0)) - Math.abs(Number(a.rateDeltaPoints || 0)) ||
      b.currentPageViews - a.currentPageViews;
  });

  const comparable = comparisons.filter((item) => item.comparable);
  return {
    comparablePageCount: comparable.length,
    improvingCount: comparable.filter((item) => item.trend === "improving").length,
    degradingCount: comparable.filter((item) => item.trend === "degrading").length,
    stableCount: comparable.filter((item) => item.trend === "stable").length,
    comparisons,
    improving: comparisons.filter((item) => item.trend === "improving"),
    degrading: comparisons.filter((item) => item.trend === "degrading"),
  };
}

function buildTemporalOptimization(currentRows = [], currentPages = [], previousRows = [], previousPages = []) {
  const comparison = buildTemporalComparison(currentPages, previousPages);
  const rankings = buildNetworkRankings(currentPages);
  const degradingPriorities = comparison.degrading.map((item) => ({
    siteSlug: item.siteSlug,
    pageSlug: item.pageSlug,
    priority: item.confidence === "strong" ? "high" : "medium",
    kind: "temporal-degradation",
    confidence: item.confidence,
    pageViews: item.currentPageViews,
    conversionRate: item.currentConversionRate,
    previousConversionRate: item.previousConversionRate,
    rateDeltaPoints: item.rateDeltaPoints,
    recommendation: "Comparer les changements récents de cette page et restaurer les éléments ayant historiquement mieux converti avant tout nouveau test.",
  }));

  return {
    ...comparison,
    rankings,
    degradingPriorities,
    currentActionCount: currentRows.filter((row) => row.action !== "page_view").reduce((sum, row) => sum + Number(row.events || 0), 0),
    previousActionCount: previousRows.filter((row) => row.action !== "page_view").reduce((sum, row) => sum + Number(row.events || 0), 0),
  };
}

class PublicConversionService {
  constructor(database) {
    this.database = database;
  }

  async ingest({ request, siteSlug, input, now = new Date() }) {
    const tenant = await resolveTenant(this.database, request);
    const site = await resolveSite(this.database, tenant.id, siteSlug);
    const event = validateConversionInput(input, { siteSlug: site.slug, now });

    const rows = await this.database.$queryRaw(Prisma.sql`
      INSERT INTO "PublicConversionEvent" (
        "tenantId", "siteId", "agencyId", "siteSlug", "pageSlug", "pagePath",
        "intent", "action", "placement", "label", "target", "referrerPath", "occurredAt"
      ) VALUES (
        ${tenant.id}, ${site.id}, ${site.agencyId}, ${site.slug}, ${event.pageSlug}, ${event.pagePath},
        ${event.intent}, ${event.action}, ${event.placement}, ${event.label}, ${event.target}, ${event.referrerPath}, ${event.occurredAt}
      )
      RETURNING "id", "occurredAt"
    `);

    return {
      accepted: true,
      id: String(rows?.[0]?.id || ""),
      occurredAt: rows?.[0]?.occurredAt || event.occurredAt,
    };
  }

  async summary({ request, siteSlug = null, days = 30, now = new Date() }) {
    const tenant = await resolveTenant(this.database, request);
    const boundedDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const windowMs = boundedDays * 86400000;
    const currentTo = new Date(now);
    const currentFrom = new Date(currentTo.getTime() - windowMs);
    const previousFrom = new Date(currentFrom.getTime() - windowMs);
    const slug = String(siteSlug || "").trim() || null;

    const readPeriod = async (from, to) => this.database.$queryRaw(Prisma.sql`
      SELECT
        "siteSlug",
        "pageSlug",
        "action",
        "intent",
        COUNT(*)::int AS "events",
        MIN("occurredAt") AS "firstEventAt",
        MAX("occurredAt") AS "lastEventAt"
      FROM "PublicConversionEvent"
      WHERE "tenantId" = ${tenant.id}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
        AND (${slug}::text IS NULL OR "siteSlug" = ${slug})
      GROUP BY "siteSlug", "pageSlug", "action", "intent"
      ORDER BY "events" DESC, "siteSlug", "pageSlug"
    `);

    const [rows, previousRows] = await Promise.all([
      readPeriod(currentFrom, currentTo),
      readPeriod(previousFrom, currentFrom),
    ]);

    const total = rows.reduce((sum, row) => sum + Number(row.events || 0), 0);
    const funnel = buildFunnel(rows);
    const previousFunnel = buildFunnel(previousRows);
    const optimization = buildOptimizationInsights(rows, funnel.pages);
    const temporal = buildTemporalOptimization(rows, funnel.pages, previousRows, previousFunnel.pages);

    return {
      tenantId: tenant.id,
      siteSlug: slug,
      days: boundedDays,
      totalEvents: total,
      ...funnel,
      optimization,
      temporal: {
        periodDays: boundedDays,
        currentPeriod: { from: currentFrom, to: currentTo },
        previousPeriod: { from: previousFrom, to: currentFrom },
        previousPageViews: previousFunnel.pageViews,
        previousConversionEvents: previousFunnel.conversionEvents,
        previousConversionRate: previousFunnel.conversionRate,
        pageViewDeltaPercent: percentDelta(funnel.pageViews, previousFunnel.pageViews),
        conversionEventDeltaPercent: percentDelta(funnel.conversionEvents, previousFunnel.conversionEvents),
        conversionRateDeltaPoints:
          funnel.conversionRate != null && previousFunnel.conversionRate != null
            ? Number((funnel.conversionRate - previousFunnel.conversionRate).toFixed(2))
            : null,
        ...temporal,
      },
      rows,
    };
  }
}

module.exports = {
  PublicConversionService,
  buildBenchmarks,
  buildFunnel,
  buildNetworkRankings,
  buildOptimizationInsights,
  buildTemporalComparison,
  buildTemporalOptimization,
  confidenceForViews,
  percentDelta,
  resolveSite,
  resolveTenant,
};
