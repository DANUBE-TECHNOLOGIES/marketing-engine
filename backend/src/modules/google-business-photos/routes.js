"use strict";

const express = require("express");
const GoogleBusinessPhotoRepository = require("./repository");
const GoogleBusinessPhotoService = require("./service");

function tenantIdFromRequest(req) {
  const tenantId = req.tenant?.id || req.tenantId;

  if (!tenantId) {
    const error = new Error("Tenant introuvable.");
    error.statusCode = 400;
    error.code = "TENANT_REQUIRED";
    throw error;
  }

  return tenantId;
}

module.exports = function createGoogleBusinessPhotoRoutes({ prisma }) {
  const router = express.Router();

  function serviceFor(req) {
    return new GoogleBusinessPhotoService(
      prisma,
      new GoogleBusinessPhotoRepository(prisma),
      tenantIdFromRequest(req)
    );
  }

  router.get(
    "/agencies/:agencyId/google-business/photos",
    async (req, res, next) => {
      try {
        res.json(await serviceFor(req).list(req.params.agencyId));
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/agencies/:agencyId/google-business/photos/sync",
    async (req, res, next) => {
      try {
        res.json(await serviceFor(req).sync(req.params.agencyId));
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/public/agency-sites/:siteSlug/photos",
    async (req, res, next) => {
      try {
        res.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=1800"
        );
        res.json(await serviceFor(req).publicList(req.params.siteSlug));
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
