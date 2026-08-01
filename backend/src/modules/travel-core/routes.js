"use strict";

const express = require("express");
const TravelCoreRepository = require("./repository");
const { TravelCoreService } = require("./service");
const { TravelCoreImporter } = require("./importer");

module.exports = function createTravelCoreRoutes({ prisma }) {
  if (!prisma) throw new Error("Travel Core routes require Prisma");

  const router = express.Router();

  function serviceFor(req) {
    if (!req.tenantId) {
      const error = new Error("Contexte tenant absent.");
      error.statusCode = 400;
      error.code = "TENANT_REQUIRED";
      throw error;
    }

    return new TravelCoreService(
      new TravelCoreRepository(prisma, req.tenantId)
    );
  }

  function route(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res);
      } catch (error) {
        next(error);
      }
    };
  }

  router.get("/travel-core/v1/health", (_req, res) => {
    res.json({
      ok: true,
      version: "18.1.2",
      capability: "travel-core-foundation",
      api: "/travel-core/v1",
      entities: ["country", "region", "city", "destination"],
    });
  });

  router.get(
    "/travel-core/v1/overview",
    route(async (req, res) => {
      res.json({
        ok: true,
        overview: await serviceFor(req).overview(),
      });
    })
  );

  router.get(
    "/travel-core/v1/countries",
    route(async (req, res) => {
      const items = await serviceFor(req).listCountries(req.query);
      res.json({ ok: true, count: items.length, items });
    })
  );

  router.get(
    "/travel-core/v1/countries/:id",
    route(async (req, res) => {
      res.json({
        ok: true,
        item: await serviceFor(req).getCountry(req.params.id),
      });
    })
  );

  router.get(
    "/travel-core/v1/regions",
    route(async (req, res) => {
      const items = await serviceFor(req).listRegions(req.query);
      res.json({ ok: true, count: items.length, items });
    })
  );

  router.get(
    "/travel-core/v1/cities",
    route(async (req, res) => {
      const items = await serviceFor(req).listCities(req.query);
      res.json({ ok: true, count: items.length, items });
    })
  );

  router.get(
    "/travel-core/v1/destinations",
    route(async (req, res) => {
      const items = await serviceFor(req).listDestinations(req.query);
      res.json({ ok: true, count: items.length, items });
    })
  );


  router.get(
    "/travel-core/v1/destinations/:id/context",
    route(async (req, res) => {
      res.json({
        ok: true,
        context: await serviceFor(req).getDestinationContext(
          req.params.id,
          req.query
        ),
      });
    })
  );

  router.get(
    "/travel-core/v1/destinations/:id",
    route(async (req, res) => {
      res.json({
        ok: true,
        item: await serviceFor(req).getDestination(req.params.id),
      });
    })
  );

  router.get(
    "/travel-core/v1/search",
    route(async (req, res) => {
      res.json({
        ok: true,
        ...(await serviceFor(req).search(req.query)),
      });
    })
  );


  router.post(
    "/travel-core/v1/import",
    route(async (req, res) => {
      if (!req.tenantId) {
        const error = new Error("Contexte tenant absent.");
        error.statusCode = 400;
        error.code = "TENANT_REQUIRED";
        throw error;
      }

      const importer = new TravelCoreImporter(prisma, req.tenantId);
      const report = await importer.import(req.body);

      res.status(report.dryRun ? 200 : 201).json({
        ok: report.failed === 0,
        report,
      });
    })
  );

  return router;
};
