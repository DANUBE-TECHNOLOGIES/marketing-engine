"use strict";
const express = require("express");
const { publishedOffers, monthlyExclusives } = require("./domain");

/**
 * Public read-only routes. Agency eligibility is always checked server-side.
 * No offer is exposed to an agency until its status is explicitly enabled.
 */
module.exports = function createFramRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/public/ambassade-fram/sites/:siteSlug/offers", async (req, res) => {
    const siteSlug = String(req.params.siteSlug || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(siteSlug)) return res.status(400).json({ error: "Invalid site" });
    try {
      const tenantSlug = String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
      const site = await prisma.agencySite.findFirst({
        where: {
          slug: siteSlug,
          OR: [
            { status: { in: ["published", "publish", "live", "online", "active"] } },
            { publishedAt: { not: null } },
          ],
          agency: { tenant: { slug: tenantSlug } },
        },
        select: { agencyId: true },
      });
      if (!site) return res.status(404).json({ error: "Not found" });
      const membership = await prisma.framAmbassadorAgency.findUnique({ where: { agencyId: site.agencyId } });
      if (!membership?.enabled || !membership.approvedAt) return res.status(404).json({ error: "Not found" });
      const now = new Date();
      const offers = await prisma.framOffer.findMany({
        where: { status: "PUBLISHED", startAt: { lte: now }, endAt: { gt: now } },
        orderBy: [{ startAt: "desc" }, { id: "asc" }],
        take: 100,
      });
      const publicFields = offer => ({
        id: offer.id, type: offer.type, title: offer.title, description: offer.description,
        imageUrl: offer.imageUrl, terms: offer.terms, priceCents: offer.priceCents,
        quoteUrl: offer.quoteUrl, startAt: offer.startAt, endAt: offer.endAt,
      });
      res.set("Cache-Control", "public, max-age=60");
      return res.json({
        monthlyExclusives: monthlyExclusives(offers, now).map(publicFields),
        flashSales: publishedOffers(offers, now).filter(offer => offer.type === "VENTE_FLASH").map(publicFields),
      });
    } catch (error) {
      console.error("FRAM site offers failed", error?.message);
      return res.status(503).json({ error: "Offers unavailable" });
    }
  });
  router.get("/api/public/ambassade-fram/agencies/:agencyId/offers", async (req, res) => {
    const agencyId = Number(req.params.agencyId);
    if (!Number.isSafeInteger(agencyId) || agencyId <= 0) return res.status(400).json({ error: "Invalid agency" });
    try {
      const tenantSlug = String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
      const agency = await prisma.agency.findFirst({ where: { id: agencyId, tenant: { slug: tenantSlug } }, select: { id: true } });
      if (!agency) return res.status(404).json({ error: "Not found" });
      const membership = await prisma.framAmbassadorAgency.findUnique({ where: { agencyId } });
      if (!membership?.enabled || !membership.approvedAt) return res.status(404).json({ error: "Not found" });
      const offers = await prisma.framOffer.findMany({
        where: { status: "PUBLISHED", startAt: { lte: new Date() }, endAt: { gt: new Date() } },
        orderBy: [{ startAt: "desc" }, { id: "asc" }],
        take: 100,
      });
      const now = new Date();
      const publicFields = offer => ({ id: offer.id, type: offer.type, title: offer.title, description: offer.description, imageUrl: offer.imageUrl, terms: offer.terms, priceCents: offer.priceCents, quoteUrl: offer.quoteUrl, startAt: offer.startAt, endAt: offer.endAt });
      res.set("Cache-Control", "public, max-age=60");
      return res.json({
        agencyId,
        monthlyExclusives: monthlyExclusives(offers, now).map(publicFields),
        flashSales: publishedOffers(offers, now).filter(o => o.type === "VENTE_FLASH").map(publicFields),
      });
    } catch (error) {
      console.error("FRAM public offers failed", error?.message);
      return res.status(503).json({ error: "Offers unavailable" });
    }
  });
  return router;
};
