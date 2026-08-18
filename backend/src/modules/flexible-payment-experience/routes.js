"use strict";

const express = require("express");
const PaymentPolicyRepository = require("./policy-repository");
const { validatePaymentPolicyInput } = require("./payment-experience");
const { buildFlexiblePaymentOperationalStatus } = require("./operational-status");
const {
  applyPaymentPlacementPreview,
  buildPaymentPlacementPreview,
  rollbackPaymentPlacement,
} = require("./placement-executor");

function normalizeSiteKey(value) {
  return String(value || "").trim();
}

async function findSiteByKey(prisma, siteKey, options = {}) {
  const key = normalizeSiteKey(siteKey);
  if (!key) return null;

  const bySlug = await prisma.agencySite.findFirst({
    where: { slug: key.toLowerCase() },
    ...options,
  });
  if (bySlug) return bySlug;

  return prisma.agencySite.findUnique({
    where: { id: key },
    ...options,
  });
}

async function loadSite(prisma, siteKey, policyRepository = new PaymentPolicyRepository(prisma)) {
  const site = await findSiteByKey(prisma, siteKey, {
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

  if (!site) return null;
  const paymentPolicy = await policyRepository.findBySiteId(site.id);
  return { ...site, paymentPolicy };
}

async function loadNetworkSites(prisma, policyRepository = new PaymentPolicyRepository(prisma)) {
  const sites = await prisma.agencySite.findMany({
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
    orderBy: { slug: "asc" },
  });

  return Promise.all(sites.map(async (site) => ({
    ...site,
    paymentPolicy: await policyRepository.findBySiteId(site.id),
  })));
}

function sendModuleError(res, error) {
  const status = Number(error?.status || error?.statusCode || 500);
  return res.status(status).json({
    ok: false,
    error: error?.message || "Flexible payment operation failed.",
    code: error?.code || "FLEXIBLE_PAYMENT_ERROR",
  });
}

function assertPolicyWriteConfirmed(confirm) {
  if (confirm !== true) {
    const error = new Error("Flexible payment policy update requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_POLICY_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }
}

module.exports = function createFlexiblePaymentRoutes({ prisma }) {
  if (!prisma) throw new TypeError("Flexible Payment routes require Prisma.");

  const router = express.Router();
  const policyRepository = new PaymentPolicyRepository(prisma);

  router.get("/api/flexible-payment/operational-status", async (_req, res) => {
    try {
      const sites = await loadNetworkSites(prisma, policyRepository);
      const status = buildFlexiblePaymentOperationalStatus(sites);
      return res.json({ ok: true, ...status });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.get("/api/agency-sites/:siteSlug/flexible-payment", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug, policyRepository);
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
        policy: site.paymentPolicy,
        preview,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.put("/api/agency-sites/:siteSlug/flexible-payment/policy", async (req, res) => {
    try {
      assertPolicyWriteConfirmed(req.body?.confirm === true);
      const site = await loadSite(prisma, req.params.siteSlug, policyRepository);
      if (!site) {
        return res.status(404).json({
          ok: false,
          code: "FLEXIBLE_PAYMENT_SITE_NOT_FOUND",
          error: "Mini-site agence introuvable.",
        });
      }

      const policy = validatePaymentPolicyInput(req.body?.policy);
      const savedPolicy = await policyRepository.upsert(site.id, policy);
      const preview = buildPaymentPlacementPreview({
        site: { ...site, paymentPolicy: savedPolicy },
      });

      return res.json({
        ok: true,
        mode: "policy-update",
        site: { id: site.id, slug: site.slug, agencyId: site.agencyId },
        configured: true,
        policy: savedPolicy,
        preview,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/preview", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug, policyRepository);
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
        policySource: req.body?.policy === undefined ? "persisted" : "override",
        preview,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/apply", async (req, res) => {
    try {
      const site = await loadSite(prisma, req.params.siteSlug, policyRepository);
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

      return res.json({
        ok: true,
        mode: "apply",
        policySource: req.body?.policy === undefined ? "persisted" : "override",
        ...result,
      });
    } catch (error) {
      return sendModuleError(res, error);
    }
  });

  router.post("/api/agency-sites/:siteSlug/flexible-payment/rollback", async (req, res) => {
    try {
      const site = await findSiteByKey(prisma, req.params.siteSlug, {
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

module.exports.assertPolicyWriteConfirmed = assertPolicyWriteConfirmed;
module.exports.findSiteByKey = findSiteByKey;
module.exports.loadNetworkSites = loadNetworkSites;
module.exports.loadSite = loadSite;
module.exports.normalizeSiteKey = normalizeSiteKey;
