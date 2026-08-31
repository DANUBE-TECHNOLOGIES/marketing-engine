"use strict";

const express = require("express");
const { sendLeadNotification } = require("../lib/leadNotifications");

const PROJECTS = new Set(["leisure", "group", "business"]);
const SOURCES = new Set(["general", "group", "business"]);
const STATUSES = new Set(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);
const buckets = new Map();

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function limited(req) {
  const now = Date.now();
  const key = clean(req.headers["x-forwarded-for"] || req.ip || "unknown", 120).split(",")[0];
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > 900000) bucket = { start: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count > 8;
}

function validate(body = {}) {
  const data = {
    project: clean(body.project, 30),
    source: clean(body.source, 30) || "general",
    siteSlug: clean(body.siteSlug, 160),
    name: clean(body.name, 120),
    phone: clean(body.phone, 50),
    email: clean(body.email, 180).toLowerCase(),
    destination: clean(body.destination, 240),
    dates: clean(body.dates, 160),
    travellers: clean(body.travellers, 120),
    budget: clean(body.budget, 160),
    wishes: clean(body.wishes, 2500),
  };
  if (clean(body.website, 200)) return { spam: true };
  if (!PROJECTS.has(data.project)) return { error: "INVALID_PROJECT" };
  if (!SOURCES.has(data.source)) return { error: "INVALID_SOURCE" };
  if (!/^[a-z0-9-]{2,160}$/.test(data.siteSlug)) return { error: "INVALID_SITE" };
  if (data.name.length < 2) return { error: "INVALID_NAME" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "INVALID_EMAIL" };
  if (data.phone.replace(/\D/g, "").length < 8) return { error: "INVALID_PHONE" };
  if (!data.destination || !data.dates || !data.travellers) return { error: "MISSING_PROJECT_DETAILS" };
  return { data };
}

async function loadLeadForNotification(prisma, id) {
  const rows = await prisma.$queryRaw`
    SELECT
      l."id", l."agencyId", l."agencySiteId", l."siteSlug", l."projectType", l."source",
      l."name", l."phone", l."email", l."destination", l."travelDates", l."travellers",
      l."budget", l."wishes", l."status", l."erpSyncStatus", l."notificationStatus",
      l."notificationSentAt", l."notificationMessageId", l."notificationError",
      l."createdAt", l."updatedAt",
      a."name" AS "agencyName", a."city" AS "agencyCity", a."email" AS "agencyEmail"
    FROM "PublicLead" l
    LEFT JOIN "Agency" a ON a."id" = l."agencyId"
    WHERE l."id" = ${id}
    LIMIT 1
  `;
  const lead = rows[0];
  if (!lead) return null;
  return {
    lead,
    agency: { id: lead.agencyId, name: lead.agencyName, city: lead.agencyCity, email: lead.agencyEmail },
  };
}

async function persistNotificationResult(prisma, id, result, errorMessage = null) {
  const status = clean(result?.status || (errorMessage ? "FAILED" : "NOT_SENT"), 30);
  const messageId = clean(result?.messageId, 240) || null;
  const error = clean(errorMessage || result?.reason, 1000) || null;
  const sent = result?.sent === true;

  await prisma.$executeRaw`
    UPDATE "PublicLead"
    SET
      "notificationStatus" = ${status},
      "notificationSentAt" = CASE WHEN ${sent} THEN NOW() ELSE "notificationSentAt" END,
      "notificationMessageId" = ${messageId},
      "notificationError" = ${error},
      "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

async function notifyLead(prisma, id) {
  const loaded = await loadLeadForNotification(prisma, id);
  if (!loaded) return { ok: false, statusCode: 404, error: "LEAD_NOT_FOUND" };

  await prisma.$executeRaw`
    UPDATE "PublicLead"
    SET "notificationStatus" = 'PENDING', "notificationError" = NULL, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;

  try {
    const result = await sendLeadNotification(loaded);
    await persistNotificationResult(prisma, id, result);
    return { ok: true, notification: result };
  } catch (error) {
    const message = clean(error?.message || "EMAIL_SEND_FAILED", 1000);
    await persistNotificationResult(prisma, id, { status: "FAILED", sent: false }, message);
    console.error("[public-leads] notification failed", { leadId: id, error: message });
    return { ok: true, notification: { sent: false, status: "FAILED", reason: message } };
  }
}

function createPublicLeadsRoutes(prisma) {
  const router = express.Router();

  router.post("/api/public/leads", async (req, res) => {
    if (limited(req)) return res.status(429).json({ ok: false, error: "RATE_LIMITED" });
    const checked = validate(req.body);
    if (checked.spam) return res.status(202).json({ ok: true });
    if (checked.error) return res.status(400).json({ ok: false, error: checked.error });

    try {
      const site = await prisma.agencySite.findFirst({
        where: { slug: checked.data.siteSlug },
        select: { id: true, agencyId: true, slug: true },
      });
      if (!site) return res.status(404).json({ ok: false, error: "SITE_NOT_FOUND" });

      const rows = await prisma.$queryRaw`
        INSERT INTO "PublicLead"
          ("id","agencyId","agencySiteId","siteSlug","projectType","source","name","phone","email","destination","travelDates","travellers","budget","wishes","status","erpSyncStatus","notificationStatus","createdAt","updatedAt")
        VALUES
          (concat('lead_',replace(gen_random_uuid()::text,'-','')),${site.agencyId},${site.id},${site.slug},${checked.data.project},${checked.data.source},${checked.data.name},${checked.data.phone},${checked.data.email},${checked.data.destination},${checked.data.dates},${checked.data.travellers},${checked.data.budget || null},${checked.data.wishes || null},'NEW','DISABLED','PENDING',NOW(),NOW())
        RETURNING "id","status","createdAt"
      `;

      const notificationResult = await notifyLead(prisma, rows[0].id);
      return res.status(201).json({
        ok: true,
        lead: rows[0],
        notification: notificationResult.notification || { sent: false, status: "UNKNOWN" },
      });
    } catch (error) {
      console.error("[public-leads] intake failed", error);
      return res.status(500).json({ ok: false, error: "LEAD_INTAKE_FAILED" });
    }
  });

  router.get("/api/leads", async (req, res) => {
    try {
      const status = clean(req.query.status, 20).toUpperCase();
      const siteSlug = clean(req.query.siteSlug, 160);
      const projectType = clean(req.query.projectType, 30);
      const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 250);

      const rows = await prisma.$queryRaw`
        SELECT
          l."id", l."agencyId", l."agencySiteId", l."siteSlug", l."projectType", l."source",
          l."name", l."phone", l."email", l."destination", l."travelDates", l."travellers",
          l."budget", l."wishes", l."status", l."erpSyncStatus",
          l."notificationStatus", l."notificationSentAt", l."notificationMessageId", l."notificationError",
          l."createdAt", l."updatedAt",
          a."name" AS "agencyName", a."city" AS "agencyCity", a."email" AS "agencyEmail"
        FROM "PublicLead" l
        LEFT JOIN "Agency" a ON a."id" = l."agencyId"
        WHERE (${status || null}::text IS NULL OR l."status" = ${status || null})
          AND (${siteSlug || null}::text IS NULL OR l."siteSlug" = ${siteSlug || null})
          AND (${projectType || null}::text IS NULL OR l."projectType" = ${projectType || null})
        ORDER BY l."createdAt" DESC
        LIMIT ${limit}
      `;

      const counts = await prisma.$queryRaw`
        SELECT "status", COUNT(*)::int AS "count"
        FROM "PublicLead"
        GROUP BY "status"
      `;

      return res.json({ ok: true, leads: rows, counts });
    } catch (error) {
      console.error("[leads] list failed", error);
      return res.status(500).json({ ok: false, error: "LEADS_LIST_FAILED" });
    }
  });

  router.patch("/api/leads/:id/status", async (req, res) => {
    const id = clean(req.params.id, 120);
    const status = clean(req.body?.status, 20).toUpperCase();
    if (!/^lead_[a-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, error: "INVALID_LEAD_ID" });
    if (!STATUSES.has(status)) return res.status(400).json({ ok: false, error: "INVALID_STATUS" });

    try {
      const rows = await prisma.$queryRaw`
        UPDATE "PublicLead"
        SET "status" = ${status}, "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING "id", "status", "updatedAt"
      `;
      if (!rows[0]) return res.status(404).json({ ok: false, error: "LEAD_NOT_FOUND" });
      return res.json({ ok: true, lead: rows[0] });
    } catch (error) {
      console.error("[leads] status update failed", error);
      return res.status(500).json({ ok: false, error: "LEAD_STATUS_UPDATE_FAILED" });
    }
  });

  router.post("/api/leads/:id/notify", async (req, res) => {
    const id = clean(req.params.id, 120);
    if (!/^lead_[a-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, error: "INVALID_LEAD_ID" });

    try {
      const result = await notifyLead(prisma, id);
      if (!result.ok) return res.status(result.statusCode || 500).json(result);
      return res.json(result);
    } catch (error) {
      console.error("[leads] notify retry failed", error);
      return res.status(500).json({ ok: false, error: "LEAD_NOTIFY_FAILED" });
    }
  });

  return router;
}

module.exports = createPublicLeadsRoutes;
module.exports.validate = validate;
module.exports.STATUSES = STATUSES;
module.exports.notifyLead = notifyLead;
