const express = require("express");
const service = require("./network-geo.service");
const applyService = require("./network-geo-apply.service");
const personService = require("./network-person-reconciliation.service");
const personApplyService = require("./network-person-apply.service");
const teamLinkService = require("./network-team-link.service");
const publicReadinessService = require("./network-public-readiness.service");

const router = express.Router();

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function tenantSlug(req) {
  return req.headers["x-tenant-slug"] || req.query?.tenantSlug || "mondescale";
}

router.get(
  "/report",
  asyncRoute(async (req, res) => {
    const result = await service.report({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.get(
  "/public-readiness",
  asyncRoute(async (req, res) => {
    const result = await publicReadinessService.report({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.get(
  "/people-report",
  asyncRoute(async (req, res) => {
    const result = await personService.report({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.get(
  "/people-apply-preview",
  asyncRoute(async (req, res) => {
    const result = await personApplyService.preview({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.post(
  "/apply-people",
  asyncRoute(async (req, res) => {
    const result = await personApplyService.apply({
      tenantSlug: tenantSlug(req),
      approvalToken: req.body?.approvalToken,
    });

    res.json({ data: result });
  })
);

router.get(
  "/team-link-preview",
  asyncRoute(async (req, res) => {
    const result = await teamLinkService.preview({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.post(
  "/apply-team-links",
  asyncRoute(async (req, res) => {
    const result = await teamLinkService.apply({
      tenantSlug: tenantSlug(req),
      approvalToken: req.body?.approvalToken,
    });

    res.json({ data: result });
  })
);

router.get(
  "/apply-preview",
  asyncRoute(async (req, res) => {
    const result = await applyService.preview({
      tenantSlug: tenantSlug(req),
    });

    res.json({ data: result });
  })
);

router.post(
  "/apply-agencies",
  asyncRoute(async (req, res) => {
    const result = await applyService.apply({
      tenantSlug: tenantSlug(req),
      approvalToken: req.body?.approvalToken,
    });

    res.json({ data: result });
  })
);

module.exports = router;
