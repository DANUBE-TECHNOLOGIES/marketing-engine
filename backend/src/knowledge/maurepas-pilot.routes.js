const express = require("express");
const service = require("./maurepas-pilot.service");

const router = express.Router();

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get(
  "/report",
  asyncRoute(async (_req, res) => {
    const result = await service.report();
    res.json({ data: result });
  })
);

router.get(
  "/preview",
  asyncRoute(async (_req, res) => {
    const result = await service.preview();
    res.json({ data: result });
  })
);

router.post(
  "/apply",
  asyncRoute(async (req, res) => {
    const result = await service.apply({
      approvalToken: req.body?.approvalToken,
    });

    res.json({ data: result });
  })
);

module.exports = router;
