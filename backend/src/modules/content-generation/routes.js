"use strict";

const express = require("express");

const ContentGenerationRepository =
  require("./repository");

const {
  ContentGenerationService,
} = require("./service");

const {
  createTravelCoreExecutor,
} = require("./travel-core-executor");

module.exports = ({ prisma }) => {
  const router = express.Router();

  function service(req) {
    const repository =
      new ContentGenerationRepository(
        prisma,
        req.tenantId
      );

    const executor =
      createTravelCoreExecutor({
        repository,
      });

    return new ContentGenerationService(
      repository,
      req.tenantId,
      { executor }
    );
  }

  router.get(
    "/generation/health",
    (req, res) => {
      res.json({
        ...service(req).health(),
        executor: "travel-core",
        executorVersion: "18.1.9",
      });
    }
  );

  router.get(
    "/generation/jobs",
    async (req, res, next) => {
      try {
        res.json(
          await service(req).list(req.query)
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/generation/jobs",
    async (req, res, next) => {
      try {
        res
          .status(202)
          .json(
            await service(req).create(
              req.body || {}
            )
          );
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/generation/jobs/:id",
    async (req, res, next) => {
      try {
        res.json(
          await service(req).get(
            req.params.id
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/generation/jobs/:id/run",
    async (req, res, next) => {
      try {
        res.json(
          await service(req).run(
            req.params.id
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/generation/jobs/:id/cancel",
    async (req, res, next) => {
      try {
        res.json(
          await service(req).cancel(
            req.params.id
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
