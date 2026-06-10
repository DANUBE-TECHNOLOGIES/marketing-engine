const express = require("express");

module.exports = function createGooglePostsQueueRoutes(prisma) {
  const router = express.Router();

  router.post("/google-posts/queue-approved", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        where: {
          status: "approved",
          googlePostName: null
        },
        include: { agency: true },
        orderBy: [
          { plannedAt: "asc" },
          { createdAt: "asc" }
        ],
        take: 100
      });

      let queued = 0;
      const skipped = [];

      const alreadyQueuedTodayByAgency = {};

      for (const post of posts) {
        if (!post.agencyId) {
          skipped.push({ id: post.id, reason: "no_agency" });
          continue;
        }

        const todayKey = `${post.agencyId}`;

        if (alreadyQueuedTodayByAgency[todayKey]) {
          skipped.push({ id: post.id, reason: "agency_already_queued" });
          continue;
        }

        const publishedToday = await prisma.googlePost.findFirst({
          where: {
            agencyId: post.agencyId,
            status: "published",
            publishedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        });

        if (publishedToday) {
          skipped.push({ id: post.id, reason: "agency_already_published_today" });
          continue;
        }

        await prisma.googlePost.update({
          where: { id: post.id },
          data: {
            status: "queued"
          }
        });

        alreadyQueuedTodayByAgency[todayKey] = true;
        queued++;
      }

      res.json({
        approved: posts.length,
        queued,
        skipped
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/google-posts/publish-queue", async (req, res) => {
    try {
      const max = Number(req.body.max || 10);

      const posts = await prisma.googlePost.findMany({
        where: {
          status: "queued",
          googlePostName: null
        },
        include: { agency: true },
        orderBy: [
          { plannedAt: "asc" },
          { createdAt: "asc" }
        ],
        take: max
      });

      const results = [];

      for (const post of posts) {
        try {
          const alreadyPublishedToday = await prisma.googlePost.findFirst({
            where: {
              agencyId: post.agencyId,
              status: "published",
              publishedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          });

          if (alreadyPublishedToday) {
            results.push({
              id: post.id,
              ok: false,
              skipped: true,
              reason: "agency_already_published_today"
            });
            continue;
          }

          const publishRes = await fetch(
            `http://localhost:${process.env.PORT || 4000}/google-posts/${post.id}/publish-google`,
            { method: "POST" }
          );

          const data = await publishRes.json();

          results.push({
            id: post.id,
            ok: publishRes.ok,
            data
          });
        } catch (error) {
          await prisma.googlePost.update({
            where: { id: post.id },
            data: {
              status: "error",
              lastPublishError: error.message
            }
          });

          results.push({
            id: post.id,
            ok: false,
            error: error.message
          });
        }
      }

      res.json({
        total: posts.length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/google-posts/queue-status", async (req, res) => {
    try {
      const [draft, approved, queued, published, error] = await Promise.all([
        prisma.googlePost.count({ where: { status: "draft" } }),
        prisma.googlePost.count({ where: { status: "approved" } }),
        prisma.googlePost.count({ where: { status: "queued" } }),
        prisma.googlePost.count({ where: { status: "published" } }),
        prisma.googlePost.count({ where: { status: "error" } })
      ]);

      res.json({
        draft,
        approved,
        queued,
        published,
        error
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
