const express = require("express");

const service = require(
  "./knowledge-relation.service"
);

const router = express.Router({
  mergeParams: true,
});

function asyncRoute(handler) {
  return function wrappedRoute(
    req,
    res,
    next
  ) {
    Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
}

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.list(
      req.params.id
    );

    res.json(result);
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.create(
      req.params.id,
      req.body
    );

    res.status(201).json({
      data: result,
    });
  })
);

router.patch(
  "/:relationId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.relationId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.put(
  "/:relationId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.relationId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.delete(
  "/:relationId",
  asyncRoute(async (req, res) => {
    const result = await service.remove(
      req.params.id,
      req.params.relationId
    );

    res.json({
      data: result,
    });
  })
);

module.exports = router;
