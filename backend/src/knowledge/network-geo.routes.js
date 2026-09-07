const express = require("express");
const service = require("./network-geo.service");

const router = express.Router();

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get(
  "/report",
  asyncRoute(async (req, res) => {
    const result = await service.report({
      tenantSlug: req.headers["x-tenant-slug"] || req.query?.tenantSlug || "mondescale",
    });

    res.json({ data: result });
  })
);

module.exports = router;
