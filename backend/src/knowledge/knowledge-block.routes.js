const express = require("express");

const service = require(
  "./knowledge-block.service"
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

router.post(
  "/reorder",
  asyncRoute(async (req, res) => {
    const result = await service.reorder(
      req.params.id,
      req.body
    );

    res.json(result);
  })
);

router.patch(
  "/:blockId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.blockId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.put(
  "/:blockId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.blockId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.delete(
  "/:blockId",
  asyncRoute(async (req, res) => {
    const result = await service.remove(
      req.params.id,
      req.params.blockId
    );

    res.json({
      data: result,
    });
  })
);

module.exports = router;
