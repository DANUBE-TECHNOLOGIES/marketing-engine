const express = require("express");

module.exports = function createSeoHistoryRoutes(prisma) {
  const router = express.Router();

  router.post("/seo-history/snapshot", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          googlePosts: true,
          reviews: true,
          directoryListings: true
        }
      });

      let created = 0;
      let updated = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (const agency of agencies) {
        const postScore = Math.min(
          100,
          agency.googlePosts.filter((p) => p.status === "published").length * 20
        );

        const reviewScore = Math.min(
          100,
          agency.reviews.filter(
            (r) => new Date(r.createdAt) > new Date(Date.now() - 30 * 86400000)
          ).length * 33
        );

        const citationScore = agency.directoryListings.length
          ? Math.round(
              (agency.directoryListings.filter((l) => l.status === "validated").length /
                agency.directoryListings.length) *
                100
            )
          : 0;

        const seoScore = Math.round(
          postScore * 0.35 + reviewScore * 0.35 + citationScore * 0.3
        );

        const existing = await prisma.$queryRawUnsafe(
          `
          SELECT id
          FROM "SeoSnapshot"
          WHERE "agencyId" = $1
          AND "snapshotDate" = $2::date
          LIMIT 1
          `,
          agency.id,
          today
        );

        if (existing.length) {
          await prisma.$executeRawUnsafe(
            `
            UPDATE "SeoSnapshot"
            SET
              "seoScore" = $1,
              "postScore" = $2,
              "reviewScore" = $3,
              "citationScore" = $4
            WHERE id = $5
            `,
            seoScore,
            postScore,
            reviewScore,
            citationScore,
            existing[0].id
          );

          updated++;
        } else {
          await prisma.$executeRawUnsafe(
            `
            INSERT INTO "SeoSnapshot"
            (
              "agencyId",
              "seoScore",
              "postScore",
              "reviewScore",
              "citationScore",
              "snapshotDate"
            )
            VALUES ($1,$2,$3,$4,$5,$6::date)
            `,
            agency.id,
            seoScore,
            postScore,
            reviewScore,
            citationScore,
            today
          );

          created++;
        }
      }

      res.json({
        ok: true,
        created,
        updated
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/seo-ranking", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        WITH latest AS (
          SELECT DISTINCT ON ("agencyId")
            *
          FROM "SeoSnapshot"
          ORDER BY "agencyId", "snapshotDate" DESC
        ),
        oldest AS (
          SELECT DISTINCT ON ("agencyId")
            *
          FROM "SeoSnapshot"
          WHERE "snapshotDate" >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY "agencyId", "snapshotDate" ASC
        )
        SELECT
          a.id,
          a.name,
          a.city,
          l."seoScore" AS score,
          l."postScore",
          l."reviewScore",
          l."citationScore",
          COALESCE(l."seoScore" - o."seoScore", 0)::int AS evolution
        FROM latest l
        JOIN "Agency" a ON a.id = l."agencyId"
        LEFT JOIN oldest o ON o."agencyId" = l."agencyId"
        ORDER BY score DESC
      `);

      res.json({
        total: rows.length,
        rows
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/seo-history/:agencyId", async (req, res) => {
    try {
      const agencyId = Number(req.params.agencyId);

      const agency = await prisma.agency.findUnique({
        where: { id: agencyId }
      });

      if (!agency) {
        return res.status(404).json({
          error: "Agence introuvable"
        });
      }

      const points = await prisma.$queryRawUnsafe(
        `
        SELECT
          "snapshotDate",
          "seoScore",
          "postScore",
          "reviewScore",
          "citationScore"
        FROM "SeoSnapshot"
        WHERE "agencyId" = $1
        ORDER BY "snapshotDate" ASC
        `,
        agencyId
      );

      const first = points[0] || null;
      const last = points[points.length - 1] || null;

      res.json({
        agencyId,
        agencyName: agency.name,
        city: agency.city,
        totalPoints: points.length,
        currentScore: last?.seoScore || 0,
        evolution:
          first && last
            ? Number(last.seoScore || 0) - Number(first.seoScore || 0)
            : 0,
        points
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
