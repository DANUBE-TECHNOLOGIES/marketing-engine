const express = require("express");
const service = require("./knowledge.service");
const knowledgeBlockRoutes = require("./knowledge-block.routes");
const knowledgeRelationRoutes = require("./knowledge-relation.routes");
const knowledgeMediaRoutes = require("./knowledge-media.routes");

const router = express.Router();

function asyncRoute(handler) {
  return function wrappedRoute(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.list(req.query);
    res.json(result);
  })
);


router.use(
  "/:id/blocks",
  knowledgeBlockRoutes
);



router.use(
  "/:id/media",
  knowledgeMediaRoutes
);

router.use(
  "/:id/relations",
  knowledgeRelationRoutes
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const result = await service.getById(req.params.id);
    res.json({ data: result });
  })
);

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const result = await service.create(req.body);
    res.status(201).json({ data: result });
  })
);

router.put(
  "/:id",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.body
    );

    res.json({ data: result });
  })
);

router.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const result = await service.update(
      req.params.id,
      req.body
    );

    res.json({ data: result });
  })
);

router.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const result = await service.remove(req.params.id);
    res.json({ data: result });
  })
);

module.exports = router;
