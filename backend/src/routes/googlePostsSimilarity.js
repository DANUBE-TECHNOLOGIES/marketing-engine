const express = require("express");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w.length > 3)
  );
}

function similarity(a, b) {
  const A = words(a);
  const B = words(b);

  if (!A.size || !B.size) return 0;

  let intersection = 0;

  for (const w of A) {
    if (B.has(w)) intersection++;
  }

  const union = new Set([...A, ...B]).size;

  return Math.round((intersection / union) * 100);
}

module.exports = function createGooglePostsSimilarityRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts/similarity-audit", async (req, res) => {
    try {
      const posts = await prisma.$queryRawUnsafe(`
        SELECT
          p.id,
          p.title,
          p.content,
          p.status,
          p."agencyId",
          p."duplicateStatus",
          p."createdAt",
          a.city AS "agencyCity"
        FROM "GooglePost" p
        LEFT JOIN "Agency" a ON a.id = p."agencyId"
        WHERE p.status IN ('published','approved','queued','draft')
        AND COALESCE(p."duplicateStatus",'') <> 'legacy_duplicate'
        ORDER BY p."createdAt" DESC
        LIMIT 150
      `);

      const alerts = [];

      for (let i = 0; i < posts.length; i++) {
        for (let j = i + 1; j < posts.length; j++) {
          const p1 = posts[i];
          const p2 = posts[j];

          if (p1.id === p2.id) continue;

          const score = similarity(
            `${p1.title} ${p1.content}`,
            `${p2.title} ${p2.content}`
          );

          if (score >= 70) {
            alerts.push({
              score,
              postA: {
                id: p1.id,
                title: p1.title,
                status: p1.status,
                agency: p1.agencyCity
              },
              postB: {
                id: p2.id,
                title: p2.title,
                status: p2.status,
                agency: p2.agencyCity
              }
            });
          }
        }
      }

      alerts.sort((a, b) => b.score - a.score);

      res.json({
        totalAlerts: alerts.length,
        alerts: alerts.slice(0, 100)
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.post("/google-posts/block-similar", async (req, res) => {
    try {
      const threshold = Number(req.body.threshold || 70);

      const published = await prisma.$queryRawUnsafe(`
        SELECT
          p.id,
          p.title,
          p.content,
          p.status,
          p."agencyId",
          p."publishedAt",
          p."duplicateStatus",
          a.city AS "agencyCity"
        FROM "GooglePost" p
        LEFT JOIN "Agency" a ON a.id = p."agencyId"
        WHERE p.status = 'published'
        AND p."publishedAt" >= NOW() - INTERVAL '60 days'
        AND COALESCE(p."duplicateStatus",'') <> 'legacy_duplicate'
      `);

      const candidates = await prisma.$queryRawUnsafe(`
        SELECT
          p.id,
          p.title,
          p.content,
          p.status,
          p."agencyId",
          a.city AS "agencyCity"
        FROM "GooglePost" p
        LEFT JOIN "Agency" a ON a.id = p."agencyId"
        WHERE p.status IN ('approved','queued')
        AND p."googlePostName" IS NULL
      `);

      let blocked = 0;
      const blockedPosts = [];

      for (const candidate of candidates) {
        let maxScore = 0;
        let matched = null;

        for (const pub of published) {
          const score = similarity(
            `${candidate.title} ${candidate.content}`,
            `${pub.title} ${pub.content}`
          );

          if (score > maxScore) {
            maxScore = score;
            matched = pub;
          }
        }

        if (maxScore >= threshold) {
          await prisma.googlePost.update({
            where: {
              id: Number(candidate.id)
            },
            data: {
              status: "draft",
              lastPublishError: `Anti-duplication : similarité ${maxScore}% avec le post ${matched?.id} (${matched?.agencyCity}).`
            }
          });

          blocked++;

          blockedPosts.push({
            id: candidate.id,
            agency: candidate.agencyCity,
            similarity: maxScore,
            matchedPostId: matched?.id,
            matchedAgency: matched?.agencyCity
          });
        }
      }

      res.json({
        threshold,
        blocked,
        blockedPosts
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
