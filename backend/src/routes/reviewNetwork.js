const express = require("express");

module.exports = function createReviewNetworkRoutes(prisma) {
  const router = express.Router();

  router.get("/review-network", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true,
          reviewRequests: true,
          networkActions: true
        },
        orderBy: {
          city: "asc"
        }
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

        const reviewed30 = agency.reviewRequests.filter((r) =>
          r.reviewObtainedAt &&
          new Date(r.reviewObtainedAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        const conversion =
          sent30
          ? Math.round((reviewed30 / sent30) * 100)
          : 0;

        const target = 3;
        const gap = Math.max(0, target - reviews30);

        let priority = "OK";
        if (reviews30 === 0) priority = "HIGH";
        else if (reviews30 < target) priority = "MEDIUM";

        return {
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          reviews30,
          target,
          gap,
          requests30,
          sent30,
          reviewed30,
          conversion,
          priority
        };
      });

      const sortedAsc = [...rows].sort((a,b)=>a.reviews30-b.reviews30);
      const sortedDesc = [...rows].sort((a,b)=>b.reviews30-a.reviews30);

      res.json({
        totalAgencies: rows.length,
        totalReviews30: rows.reduce((s,r)=>s+r.reviews30,0),
        totalRequests30: rows.reduce((s,r)=>s+r.requests30,0),
        totalSent30: rows.reduce((s,r)=>s+r.sent30,0),
        totalReviewed30: rows.reduce((s,r)=>s+r.reviewed30,0),
        high: rows.filter(r=>r.priority==="HIGH").length,
        medium: rows.filter(r=>r.priority==="MEDIUM").length,
        ok: rows.filter(r=>r.priority==="OK").length,
        top3: sortedDesc.slice(0,3),
        bottom3: sortedAsc.slice(0,3),
        rows
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/review-network/generate-actions", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true
        }
      });

      let created = 0;
      let existing = 0;

      for (const agency of agencies) {
        const reviews30 = agency.reviews.filter((r) =>
          r.createdAt &&
          new Date(r.createdAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        if (reviews30 >= 3) continue;

        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: agency.id,
            lever: "reviews",
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
            lever: "reviews",
            title: "Collecter des avis Google",
            description: `${reviews30} avis Google sur les 30 derniers jours. Objectif minimum : 3 avis mensuels.`,
            owner: "Sylvie",
            status: "todo",
            deadline: new Date(Date.now() + 7 * 86400000)
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

  return router;
};
