"use strict";

const express = require("express");

const {
  CampaignService,
} = require("./service");

module.exports = ({ prisma }) => {
  const router = express.Router();

  const service = (req) =>
    new CampaignService(
      prisma,
      req.tenantId
    );

  const route = (handler) =>
    async (req, res, next) => {
      try {
        await handler(req, res);
      } catch (error) {
        next(error);
      }
    };

  router.get(
    "/campaigns/health",
    (req, res) => {
      res.json(service(req).health());
    }
  );

  router.get(
    "/campaigns",
    route(async (req, res) => {
      res.json(
        await service(req).list()
      );
    })
  );

  router.post(
    "/campaigns",
    route(async (req, res) => {
      res.status(201).json(
        await service(req).create(
          req.body || {}
        )
      );
    })
  );

  router.get(
    "/campaigns/:id",
    route(async (req, res) => {
      res.json(
        await service(req).get(
          req.params.id
        )
      );
    })
  );

  router.put(
    "/campaigns/:id",
    route(async (req, res) => {
      res.json(
        await service(req).update(
          req.params.id,
          req.body || {}
        )
      );
    })
  );

  router.delete(
    "/campaigns/:id",
    route(async (req, res) => {
      res.json(
        await service(req).remove(
          req.params.id
        )
      );
    })
  );

  router.post(
    "/campaigns/:id/generate",
    route(async (req, res) => {
      res.status(202).json(
        await service(req).generate(
          req.params.id,
          req.body || {}
        )
      );
    })
  );

  router.get(
    "/campaigns/:id/tasks",
    route(async (req, res) => {
      res.json(
        (
          await service(req).get(
            req.params.id
          )
        ).tasks
      );
    })
  );

  router.get(
    "/campaigns/:id/assets",
    route(async (req, res) => {
      res.json(
        await service(req).listAssets(
          req.params.id,
          req.query
        )
      );
    })
  );

  router.post(
    "/campaigns/:id/assets/offers",
    route(async (req, res) => {
      res.status(201).json(
        await service(req).createOfferAsset(
          req.params.id,
          req.body || {}
        )
      );
    })
  );

  router.get(
    "/campaigns/:id/assets/:assetId",
    route(async (req, res) => {
      res.json(
        await service(req).getAsset(
          req.params.id,
          req.params.assetId
        )
      );
    })
  );

  router.put(
    "/campaigns/:id/assets/:assetId/review",
    route(async (req, res) => {
      res.json(
        await service(req).reviewAsset(
          req.params.id,
          req.params.assetId,
          req.body || {}
        )
      );
    })
  );

  router.post(
    "/campaigns/:id/assets/:assetId/approve",
    route(async (req, res) => {
      res.json(
        await service(req).approveAsset(
          req.params.id,
          req.params.assetId,
          req.body || {}
        )
      );
    })
  );

  router.post(
    "/campaigns/:id/assets/:assetId/reject",
    route(async (req, res) => {
      res.json(
        await service(req).rejectAsset(
          req.params.id,
          req.params.assetId,
          req.body || {}
        )
      );
    })
  );

  return router;
};
