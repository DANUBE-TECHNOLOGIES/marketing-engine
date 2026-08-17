"use strict";

const express = require("express");
const {
  applyPaymentPlacementPreview,
  buildPaymentPlacementPreview,
  rollbackPaymentPlacement,
} = require("./placement-executor");

function normalizeSiteSlug(value) {
  return String(value || "").trim().toLowerCase();
}

async function loadSite(prisma, siteSlug) {
  return prisma.agencySite.findUnique({
    where: { slug: normalizeSiteSlug(siteSlug) },
    include: {
      agency: true,
      pages: {
        include: {
          blocks: {
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

function sendModuleError(res, error) {
  const status = Number(error?.status || error?.statusCode || 500);
  return res.status(status).json({
    ok: false,
    error: error?.message || "Flexible payment operation failed.",
    code: error?.code || "FLEXIBLE_PAYMENT_ERROR",
  });
}

module.exports = function createFlexiblePaymentRoutes({ prisma }) {
  if (!prisma) throw new TypeError("Flexible Payment routes require Prisma.");

  const router = express.Router();

  router.get("/api/agency-sites/:siteSlug/flexible-payment", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug);
      if (!site) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_SITE_NOT_FOUND",
          error: "Mini-site agence introuvable.",
        });
      }

      const preview = buildPaymentPlacementPreview({ site });
      return res.json({
        ok: true,
        site: { id: site.id, slug: site.slug, agencyId: site.agencyId },
        configured: Boolean(site.paymentPolicy),
        preview,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/preview", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug);
      if (!site) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_SITE_NOT_FOUND",
          error: "Mini-site agence introuvable.",
        });
      }

      const preview = buildPaymentPlacementPreview({
        site,
        policy: req.body?.policy,
      });

      return res.json({
        ok: true,
        mode: "preview",
        site: { id: site.id, slug: site.slug, agencyId: site.agencyId },
        preview,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/apply", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug);
      if (!site) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_SITE_NOT_FOUND",
          error: "Mini-site agence introuvable.",
        });
      }

      const result = await applyPaymentPlacementPreview(
        { prisma },
        {
          site,
          policy: req.body?.policy,
          previewFingerprint: req.body?.previewFingerprint,
          confirm: req.body?.confirm === true,
          createdBy: req.body?.createdBy || "mse-25.32-api",
        }
      );

      return res.json({ ok: true, mode: "apply", ...result });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/rollback", async (req, res) => {
    try {
      const site = await prisma.agencySite.findUnique({
        where: { slug: normalizeSiteSlug(req.params.siteSlug) },
        select: { id: true, slug: true },
      });
      if (!site) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_SITE_NOT_FOUND",
          error: "Mini-site agence introuvable.",
        });
      }

      const pageId = String(req.body?.pageId || "").trim();
      const blockId = String(req.body?.blockId || "").trim();
      if (!pageId || !blockId) {
        return res.status(400).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_ROLLBACK_TARGET_REQUIRED",
          error: "pageId et blockId sont requis.",
        });
      }

      const page = await prisma.agencySitePage.findFirst({
        where: { id: pageId, siteId: site.id },
        select: { id: true },
      });
      if (!page) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_PAGE_NOT_FOUND",
          error: "Page introuvable pour ce mini-site.",
        });
      }

      const result = await rollbackPaymentPlacement(
        { prisma },
        {
          pageId,
          blockId,
          confirm: req.body?.confirm === true,
        }
      );

      return res.json({ ok: true, mode: "rollback", ...result });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  return router;
};

module.exports.loadSite = loadSite;
module.exports.normalizeSiteSlug = normalizeSiteSlug;
