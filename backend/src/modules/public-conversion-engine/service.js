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

  async summary({ request, siteSlug = null, days = 30 }) {
    const tenant = await resolveTenant(this.database, request);
    const boundedDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const from = new Date(Date.now() - boundedDays * 86400000);
    const slug = String(siteSlug || "").trim() || null;

    const rows = await this.database.$queryRaw(Prisma.sql`
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
        AND (${slug}::text IS NULL OR "siteSlug" = ${slug})
      GROUP BY "siteSlug", "pageSlug", "action", "intent"
      ORDER BY "events" DESC, "siteSlug", "pageSlug"
    `);

    const total = rows.reduce((sum, row) => sum + Number(row.events || 0), 0);
    const funnel = buildFunnel(rows);
    const optimization = buildOptimizationInsights(rows, funnel.pages);
    return {
      tenantId: tenant.id,
      siteSlug: slug,
      days: boundedDays,
      totalEvents: total,
      ...funnel,
      optimization,
      rows,
    };
  }
}

module.exports = {
  PublicConversionService,
  buildBenchmarks,
  buildFunnel,
  buildOptimizationInsights,
  confidenceForViews,
  resolveSite,
  resolveTenant,
};
