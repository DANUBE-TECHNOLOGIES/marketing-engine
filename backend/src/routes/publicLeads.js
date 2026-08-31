"use strict";

const express = require("express");

const PROJECTS = new Set(["leisure", "group", "business"]);
const SOURCES = new Set(["general", "group", "business"]);
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const buckets = new Map();

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function clientIp(req) {
  return clean(req.headers["x-forwarded-for"] || req.ip || "unknown", 120).split(",")[0].trim();
}

function rateLimited(req) {
  const now = Date.now();
  const key = clientIp(req);
  const current = buckets.get(key) || { start: now, count: 0 };
  if (now - current.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  buckets.set(key, current);
  return current.count > MAX_PER_WINDOW;
}

function validate(body = {}) {
  const project = clean(body.project, 30);
  const source = clean(body.source, 30) || "general";
  const siteSlug = clean(body.siteSlug, 160);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 50);
  const email = clean(body.email, 180).toLowerCase();
  const destination = clean(body.destination, 240);
  const dates = clean(body.dates, 160);
  const travellers = clean(body.travellers, 120);
  const budget = clean(body.budget, 160);
  const wishes = clean(body.wishes, 2500);
  const website = clean(body.website, 200);

  if (website) return { spam: true };
  if (!PROJECTS.has(project)) return { error: "INVALID_PROJECT" };
  if (!SOURCES.has(source)) return { error: "INVALID_SOURCE" };
  if (!siteSlug || !/^[a-z0-9-]{2,160}$/.test(siteSlug)) return { error: "INVALID_SITE" };
  if (name.length < 2) return { error: "INVALID_NAME" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "INVALID_EMAIL" };
  if (phone.replace(/\D/g, "").length < 8) return { error: "INVALID_PHONE" };
  if (!destination || !dates || !travellers) return { error: "MISSING_PROJECT_DETAILS" };

  return { data: { project, source, siteSlug, name, phone, email, destination, dates, travellers, budget, wishes } };
}

function createPublicLeadsRoutes(prisma) {
  const router = express.Router();

  router.post("/api/public/leads", async (req, res) => {
    if (rateLimited(req)) return res.status(429).json({ ok: false, error: "RATE_LIMITED" });

    const checked = validate(req.body);
    if (checked.spam) return res.status(202).json({ ok: true });
    if (checked.error) return res.status(400).json({ ok: false, error: checked.error });

    try {
      const site = await prisma.agencySite.findFirst({
        where: { slug: checked.data.siteSlug },
        select: { id: true, agencyId: true, slug: true },
      });
      if (!site) return res.status(404).json({ ok: false, error: "SITE_NOT_FOUND" });

      const lead = await prisma.publicLead.create({
        data: {
          agencyId: site.agencyId,
          agencySiteId: site.id,
          siteSlug: site.slug,
          projectType: checked.data.project,
          source: checked.data.source,
          name: checked.data.name,
          phone: checked.data.phone,
          email: checked.data.email,
          destination: checked.data.destination,
          travelDates: checked.data.dates,
          travellers: checked.data.travellers,
          budget: checked.data.budget || null,
          wishes: checked.data.wishes || null,
          status: "NEW",
          erpSyncStatus: "DISABLED",
        },
        select: { id: true, status: true, createdAt: true },
      });

      return res.status(201).json({ ok: true, lead });
    } catch (error) {
      console.error("[public-leads] intake failed", error);
      return res.status(500).json({ ok: false, error: "LEAD_INTAKE_FAILED" });
    }
  });

  return router;
}

module.exports = createPublicLeadsRoutes;
module.exports.validate = validate;
