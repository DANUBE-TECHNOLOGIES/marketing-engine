const express = require("express");

module.exports = function createGooglePostImpactRoutes(prisma) {
  const router = express.Router();

  router.post("/google-posts/measure-impact", async (req, res) => {
    try {
      const daysAfter = Number(req.body.daysAfter || 7);

      const posts = await prisma.googlePost.findMany({
        where: {
          status: "published",
          publishedAt: {
            not: null
          },
          agencyId: {
            not: null
          }
        },
        include: {
          agency: true
        },
        orderBy: {
          publishedAt: "desc"
        },
        take: 100
      });

      let measured = 0;
      const results = [];

      for (const post of posts) {
        const publishedAt = new Date(post.publishedAt);
        const afterDate = new Date(publishedAt.getTime() + daysAfter * 86400000);

        if (new Date() < afterDate) {
          continue;
        }

        const already = await prisma.$queryRawUnsafe(`
          SELECT id FROM "GooglePostImpact"
          WHERE "postId" = $1
          LIMIT 1
        `, post.id);

        if (already.length > 0) {
          continue;
        }

        const keyword =
          post.title.toLowerCase().includes("croisi") ? "croisière" :
          post.title.toLowerCase().includes("sur mesure") ? "voyage sur mesure" :
          "agence de voyage";

        const before = await prisma.realRankingCheck.findFirst({
          where: {
            agencyId: post.agencyId,
            keyword,
            checkedAt: {
              lte: publishedAt
            }
          },
          orderBy: {
            checkedAt: "desc"
          }
        });

        const after = await prisma.realRankingCheck.findFirst({
          where: {
            agencyId: post.agencyId,
            keyword,
            checkedAt: {
              gte: afterDate
            }
          },
          orderBy: {
            checkedAt: "asc"
          }
        });

        if (!before || !after || !before.position || !after.position) {
          continue;
        }

        const gain = before.position - after.position;

        await prisma.$executeRawUnsafe(`
          INSERT INTO "GooglePostImpact"
          ("postId","agencyId",keyword,"positionBefore","positionAfter",gain)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
          post.id,
          post.agencyId,
          keyword,
          before.position,
          after.position,
          gain
        );

        measured++;

        results.push({
          postId: post.id,
          agency: post.agency?.name,
          city: post.agency?.city,
          keyword,
          before: before.position,
          after: after.position,
          gain
        });
      }

      res.json({
        measured,
        results
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/google-posts/impact", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          i.*,
          p.title,
          a.name AS "agencyName",
          a.city
        FROM "GooglePostImpact" i
        LEFT JOIN "GooglePost" p ON p.id = i."postId"
        LEFT JOIN "Agency" a ON a.id = i."agencyId"
        ORDER BY i."measuredAt" DESC
        LIMIT 200
      `);

      const positive = rows.filter(r => Number(r.gain) > 0);
      const negative = rows.filter(r => Number(r.gain) < 0);

      res.json({
        total: rows.length,
        positive: positive.length,
        negative: negative.length,
        neutral: rows.filter(r => Number(r.gain) === 0).length,
        averageGain: rows.length
          ? Math.round((rows.reduce((s,r)=>s+Number(r.gain || 0),0)/rows.length)*10)/10
          : 0,
        rows
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
