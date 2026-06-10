const express = require("express");

function buildReviewMessage(agency) {
  const name = agency?.name || "votre agence de voyages";
  const city = agency?.city || "";
  const reviewUrl = agency?.googleReviewUrl || "";

  return `Bonjour,

Nous espérons que votre voyage s’est bien passé.

Votre retour est très important pour notre agence ${name}${city ? " à " + city : ""}. Si vous avez apprécié notre accompagnement, vous pouvez nous laisser un avis Google en quelques secondes.

${reviewUrl || "[Lien avis Google à compléter]"}

Merci pour votre confiance.

L’équipe ${name}`;
}

module.exports = function createReviewEngineRoutes(prisma) {
  const router = express.Router();

  router.get("/review-engine/dashboard", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true,
          reviewRequests: true
        },
        orderBy: { city: "asc" }
      });

      const rows = agencies.map((agency) => {
        const reviews30 = agency.reviews.filter((r) =>
          r.createdAt &&
          new Date(r.createdAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const requests30 = agency.reviewRequests.filter((r) =>
          r.createdAt &&
          new Date(r.createdAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const sent30 = agency.reviewRequests.filter((r) =>
          r.sentAt &&
          new Date(r.sentAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const obtained30 = agency.reviewRequests.filter((r) =>
          r.reviewObtainedAt &&
          new Date(r.reviewObtainedAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const target = 3;
        const missing = Math.max(0, target - reviews30);

        let priority = "OK";
        if (reviews30 === 0) priority = "HIGH";
        else if (reviews30 < target) priority = "MEDIUM";

        return {
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          reviews30,
          requests30,
          sent30,
          obtained30,
          target,
          missing,
          priority,
          googleReviewUrl: agency.googleReviewUrl
        };
      });

      res.json({
        totalAgencies: rows.length,
        high: rows.filter((r) => r.priority === "HIGH").length,
        medium: rows.filter((r) => r.priority === "MEDIUM").length,
        ok: rows.filter((r) => r.priority === "OK").length,
        totalReviews30: rows.reduce((s, r) => s + r.reviews30, 0),
        totalRequests30: rows.reduce((s, r) => s + r.requests30, 0),
        rows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/review-engine/requests", async (req, res) => {
    try {
      const requests = await prisma.reviewRequest.findMany({
        include: {
          agency: true
        },
        orderBy: { createdAt: "desc" },
        take: 500
      });

      res.json({
        total: requests.length,
        draft: requests.filter((r) => r.status === "draft").length,
        ready: requests.filter((r) => r.status === "ready").length,
        sent: requests.filter((r) => r.status === "sent").length,
        reviewed: requests.filter((r) => r.status === "review_obtained").length,
        requests
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/review-engine/generate-requests", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true,
          reviewRequests: true
        },
        orderBy: { city: "asc" }
      });

      let created = 0;
      const rows = [];

      for (const agency of agencies) {
        const reviews30 = agency.reviews.filter((r) =>
          r.createdAt &&
          new Date(r.createdAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const target = 3;
        const missing = Math.max(0, target - reviews30);

        if (missing === 0) continue;

        const existingDrafts = agency.reviewRequests.filter((r) =>
          ["draft", "ready"].includes(r.status)
        ).length;

        const toCreate = Math.max(0, missing - existingDrafts);

        for (let i = 0; i < toCreate; i++) {
          await prisma.reviewRequest.create({
            data: {
              agencyId: agency.id,
              clientName: "Client à compléter",
              clientPhone: null,
              clientEmail: null,
              travelReference: null,
              message: buildReviewMessage(agency),
              status: "draft",
              channel: "manual"
            }
          });

          created++;
        }

        rows.push({
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          reviews30,
          missing,
          created: toCreate
        });
      }

      res.json({
        created,
        rows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/review-engine/requests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = {};

      [
        "clientName",
        "clientPhone",
        "clientEmail",
        "travelReference",
        "message",
        "status",
        "channel"
      ].forEach((key) => {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      });

      if (req.body.status === "sent") {
        data.sentAt = new Date();
      }

      if (req.body.status === "review_obtained") {
        data.reviewObtainedAt = new Date();
      }

      const updated = await prisma.reviewRequest.update({
        where: { id },
        data,
        include: { agency: true }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
