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
    return {
      tenantId: tenant.id,
      siteSlug: slug,
      days: boundedDays,
      totalEvents: total,
      ...funnel,
      rows,
    };
  }
}

module.exports = { PublicConversionService, buildFunnel, resolveSite, resolveTenant };
