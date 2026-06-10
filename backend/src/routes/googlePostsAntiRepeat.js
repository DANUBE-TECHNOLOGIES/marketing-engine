const express = require("express");

module.exports = function createGooglePostsAntiRepeatRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts/repetition-check", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        include: { agency: true },
        orderBy: { createdAt: "desc" },
        take: 500
      });

      const warnings = [];

      for (const post of posts) {
        if (!post.agencyId || !post.seoKeyword) continue;

        const previous = await prisma.googlePost.findFirst({
          where: {
            agencyId: post.agencyId,
            seoKeyword: post.seoKeyword,
            id: { not: post.id },
            createdAt: {
              gte: new Date(Date.now() - 60 * 86400000)
            }
          },
          orderBy: { createdAt: "desc" }
        });

        if (previous) {
          warnings.push({
            postId: post.id,
            agencyId: post.agencyId,
            agencyName: post.agency?.name,
            city: post.agency?.city,
            seoKeyword: post.seoKeyword,
            previousPostId: previous.id,
            message: `Sujet "${post.seoKeyword}" déjà traité récemment pour ${post.agency?.city}.`
          });
        }
      }

      res.json({
        total: warnings.length,
        warnings
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/google-posts/block-repetitions", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        where: {
          status: {
            in: ["draft", "approved", "queued"]
          }
        },
        include: { agency: true },
        orderBy: { createdAt: "desc" },
        take: 500
      });

      let blocked = 0;

      for (const post of posts) {
        if (!post.agencyId || !post.seoKeyword) continue;

        const previous = await prisma.googlePost.findFirst({
          where: {
            agencyId: post.agencyId,
            seoKeyword: post.seoKeyword,
            id: { not: post.id },
            status: "published",
            publishedAt: {
              gte: new Date(Date.now() - 60 * 86400000)
            }
          },
          orderBy: { publishedAt: "desc" }
        });

        if (!previous) continue;

        await prisma.googlePost.update({
          where: { id: post.id },
          data: {
            status: "draft",
            lastPublishError: `Anti-répétition : sujet "${post.seoKeyword}" déjà publié dans les 60 derniers jours.`
          }
        });

        blocked++;
      }

      res.json({ blocked });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
