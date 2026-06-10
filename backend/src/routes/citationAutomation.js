const express = require("express");

module.exports = function createCitationAutomationRoutes(prisma) {
  const router = express.Router();

  router.get("/citations/dashboard", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          directoryListings: true,
          networkActions: true
        },
        orderBy: { city: "asc" }
      });

      const rows = agencies.map((agency) => {
        const listings = agency.directoryListings || [];

        const total = listings.length;
        const valid = listings.filter((l) => l.status === "validated").length;
        const missing = listings.filter((l) => l.status === "missing").length;
        const pending = listings.filter((l) => l.status === "pending").length;

        const score = total
          ? Math.round((valid / total) * 100)
          : 0;

        let priority = "OK";
        if (score < 40) priority = "HIGH";
        else if (score < 70) priority = "MEDIUM";

        return {
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          total,
          valid,
          missing,
          pending,
          score,
          priority
        };
      });

      res.json({
        totalAgencies: rows.length,
        high: rows.filter((r) => r.priority === "HIGH").length,
        medium: rows.filter((r) => r.priority === "MEDIUM").length,
        ok: rows.filter((r) => r.priority === "OK").length,
        rows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/citations/generate-actions", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          directoryListings: true
        }
      });

      let created = 0;
      let existing = 0;

      for (const agency of agencies) {
        const missing = agency.directoryListings.filter((l) =>
          ["missing", "error", "not_found"].includes(l.status)
        );

        if (missing.length === 0) continue;

        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: agency.id,
            lever: "citations",
            status: {
              in: ["todo", "in_progress"]
            }
          }
        });

        if (already) {
          existing++;
          continue;
        }

        await prisma.networkAction.create({
          data: {
            agencyId: agency.id,
            lever: "citations",
            title: "Compléter les citations locales",
            description: `${missing.length} annuaire(s) absent(s) ou non validés pour ${agency.city}.`,
            owner: "Sylvie",
            status: "todo",
            deadline: new Date(Date.now() + 14 * 86400000)
          }
        });

        created++;
      }

      res.json({
        created,
        existing
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/citations/worklist", async (req, res) => {
    try {
      const listings = await prisma.directoryListing.findMany({
        where: {
          status: {
            in: ["missing", "error", "not_found", "pending"]
          }
        },
        include: {
          agency: true,
          directory: true
        },
        orderBy: [
          { status: "asc" },
          { id: "asc" }
        ],
        take: 500
      });

      res.json({
        total: listings.length,
        listings: listings.map((l) => ({
          id: l.id,
          status: l.status,
          agencyId: l.agencyId,
          agencyName: l.agency?.name,
          city: l.agency?.city,
          directoryName: l.directory?.name,
          directoryUrl: l.directory?.url,
          agency: {
            name: l.agency?.name,
            address: l.agency?.address,
            postalCode: l.agency?.postalCode,
            city: l.agency?.city,
            phone: l.agency?.phone,
            email: l.agency?.email,
            website: l.agency?.website
          }
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/citations/listing/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, url, comment } = req.body;

      const data = {};

      if (status !== undefined) data.status = status;
      if (url !== undefined) data.url = url;
      if (comment !== undefined) data.comment = comment;

      const listing = await prisma.directoryListing.update({
        where: { id },
        data,
        include: {
          agency: true,
          directory: true
        }
      });

      res.json(listing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
