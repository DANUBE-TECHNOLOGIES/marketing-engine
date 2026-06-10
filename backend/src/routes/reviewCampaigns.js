const express = require("express");

module.exports = function createReviewCampaignRoutes(prisma) {
  const router = express.Router();

  router.get("/review-campaigns", async (req, res) => {
    try {
      const campaigns = await prisma.$queryRawUnsafe(`
        SELECT
          c.*,
          a.name AS "agencyName",
          a.city AS "city"
        FROM "ReviewCampaign" c
        LEFT JOIN "Agency" a ON a.id = c."agencyId"
        ORDER BY c."createdAt" DESC
      `);

      res.json({
        total: campaigns.length,
        active: campaigns.filter(c => c.status === "active").length,
        completed: campaigns.filter(c => c.status === "completed").length,
        campaigns
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/review-campaigns/generate", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: { reviews: true },
        orderBy: { city: "asc" }
      });

      let created = 0;
      let existing = 0;

      for (const agency of agencies) {
        const reviews30 = agency.reviews.filter(r =>
          new Date(r.createdAt) >= new Date(Date.now() - 30 * 86400000)
        ).length;

        if (reviews30 >= 3 && agency.seoLevel !== "OFFENSIVE" && agency.seoLevel !== "CRITIQUE") {
          continue;
        }

        const already = await prisma.$queryRawUnsafe(`
          SELECT id FROM "ReviewCampaign"
          WHERE "agencyId" = $1
          AND status = 'active'
          LIMIT 1
        `, agency.id);

        if (already.length > 0) {
          existing++;
          continue;
        }

        const target = agency.seoLevel === "CRITIQUE" ? 12 :
                       agency.seoLevel === "OFFENSIVE" ? 10 :
                       6;

        await prisma.$executeRawUnsafe(`
          INSERT INTO "ReviewCampaign"
          ("agencyId", title, "targetReviews", "obtainedReviews", status, source)
          VALUES ($1, $2, $3, $4, 'active', 'auto')
        `,
          agency.id,
          `Campagne avis Google - ${agency.city}`,
          target,
          reviews30
        );

        await prisma.networkAction.create({
          data: {
            agencyId: agency.id,
            lever: "review-campaign",
            title: "Campagne avis Google à piloter",
            description: `Objectif : ${target} avis. Avis obtenus sur 30 jours : ${reviews30}.`,
            owner: "Sylvie",
            status: "todo",
            deadline: new Date(Date.now() + 14 * 86400000)
          }
        });

        created++;
      }

      res.json({ created, existing });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/review-campaigns/update-progress", async (req, res) => {
    try {
      const campaigns = await prisma.$queryRawUnsafe(`
        SELECT * FROM "ReviewCampaign"
        WHERE status = 'active'
      `);

      let updated = 0;
      let completed = 0;

      for (const campaign of campaigns) {
        const reviews = await prisma.googleReview.findMany({
          where: {
            agencyId: campaign.agencyId,
            createdAt: {
              gte: campaign.createdAt
            }
          }
        });

        const obtained = reviews.length;
        const isComplete = obtained >= campaign.targetReviews;

        await prisma.$executeRawUnsafe(`
          UPDATE "ReviewCampaign"
          SET
            "obtainedReviews" = $1,
            status = $2,
            "completedAt" = CASE WHEN $3 THEN NOW() ELSE "completedAt" END
          WHERE id = $4
        `,
          obtained,
          isComplete ? "completed" : "active",
          isComplete,
          campaign.id
        );

        updated++;
        if (isComplete) completed++;
      }

      res.json({ updated, completed });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
