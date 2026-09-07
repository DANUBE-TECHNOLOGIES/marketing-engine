const express = require("express");
const service = require("./network-geo.service");
const applyService = require("./network-geo-apply.service");

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
