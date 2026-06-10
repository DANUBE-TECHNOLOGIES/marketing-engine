const express = require("express");

function buildPayload(agency, directory) {
  return {
    directory: {
      id: directory?.id,
      name: directory?.name,
      url: directory?.url,
      submissionUrl: directory?.submissionUrl || directory?.url,
      submissionMode: directory?.submissionMode || "manual"
    },
    business: {
      name: agency?.name,
      address: agency?.address,
      postalCode: agency?.postalCode,
      city: agency?.city,
      phone: agency?.phone,
      email: agency?.email,
      website: agency?.website,
      category: "Agence de voyages",
      description: `${agency?.name} accompagne ses clients dans l'organisation de séjours, circuits, croisières, billets d'avion et voyages sur mesure.`
    }
  };
}

module.exports = function createCitationAutoSubmitRoutes(prisma) {
  const router = express.Router();

  router.post("/citations/prepare-automation", async (req, res) => {
    try {
      const listings = await prisma.directoryListing.findMany({
        where: {
          status: {
            in: ["missing", "not_found", "error", "pending"]
          }
        },
        include: {
          agency: true,
          directory: true
        },
        take: 1000
      });

      let prepared = 0;

      for (const listing of listings) {
        const payload = buildPayload(listing.agency, listing.directory);

        await prisma.directoryListing.update({
          where: { id: listing.id },
          data: {
            submissionPayload: payload,
            automationStatus: "prepared"
          }
        });

        prepared++;
      }

      res.json({
        prepared
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/citations/automation-queue", async (req, res) => {
    try {
      const listings = await prisma.directoryListing.findMany({
        where: {
          status: {
            in: ["missing", "not_found", "error", "pending"]
          }
        },
        include: {
          agency: true,
          directory: true
        },
        orderBy: [
          { automationStatus: "asc" },
          { id: "asc" }
        ],
        take: 500
      });

      res.json({
        total: listings.length,
        manual: listings.filter(l => (l.directory?.submissionMode || "manual") === "manual").length,
        email: listings.filter(l => l.directory?.submissionMode === "email").length,
        api: listings.filter(l => l.directory?.submissionMode === "api").length,
        listings: listings.map((listing) => ({
          id: listing.id,
          status: listing.status,
          automationStatus: listing.automationStatus,
          agencyId: listing.agencyId,
          agencyName: listing.agency?.name,
          city: listing.agency?.city,
          directoryId: listing.directoryId,
          directoryName: listing.directory?.name,
          directoryUrl: listing.directory?.url,
          submissionUrl: listing.directory?.submissionUrl || listing.directory?.url,
          submissionMode: listing.directory?.submissionMode || "manual",
          priority: listing.directory?.priority || 50,
          payload: listing.submissionPayload || buildPayload(listing.agency, listing.directory)
        }))
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.post("/citations/mark-submitted", async (req, res) => {
    try {
      const ids = req.body.ids || [];

      const result = await prisma.directoryListing.updateMany({
        where: {
          id: {
            in: ids.map(Number)
          }
        },
        data: {
          status: "pending",
          automationStatus: "submitted",
          submittedAt: new Date()
        }
      });

      res.json({
        updated: result.count
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.post("/citations/mark-validated", async (req, res) => {
    try {
      const ids = req.body.ids || [];

      const result = await prisma.directoryListing.updateMany({
        where: {
          id: {
            in: ids.map(Number)
          }
        },
        data: {
          status: "validated",
          automationStatus: "validated",
          lastCheckedAt: new Date()
        }
      });

      res.json({
        updated: result.count
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
