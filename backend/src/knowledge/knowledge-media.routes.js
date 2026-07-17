const express = require("express");

const service = require(
  "./knowledge-media.service"
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
  "/:mediaId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.mediaId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.put(
  "/:mediaId",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.params.mediaId,
      req.body
    );

    res.json({
      data: result,
    });
  })
);

router.delete(
  "/:mediaId",
  asyncRoute(async (req, res) => {
    const result = await service.remove(
      req.params.id,
      req.params.mediaId
    );

    res.json({
      data: result,
    });
  })
);

module.exports = router;
