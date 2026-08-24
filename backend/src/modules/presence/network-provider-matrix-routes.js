"use strict";

const express = require("express");
const { buildNetworkProviderMatrix } = require("./network-provider-matrix");

function networkProviderMatrixRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/presence/network/provider-matrix", async (req, res) => {
    try {
      const [agencies, directories, listings] = await Promise.all([
        prisma.agency.findMany({ orderBy: { id: "asc" } }),
        prisma.localDirectory.findMany({ orderBy: { id: "asc" } }),
        prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] })
      ]);
      return res.json({ ok: true, generatedAt: new Date().toISOString(), ...buildNetworkProviderMatrix(agencies, directories, listings) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
  return router;
}

module.exports = { networkProviderMatrixRoutes };
