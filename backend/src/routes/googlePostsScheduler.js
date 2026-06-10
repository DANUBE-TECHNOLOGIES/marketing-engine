const express = require("express");

module.exports = function createGooglePostsSchedulerRoutes(prisma) {
  const router = express.Router();

  const slots = [
    { hour: 8, minute: 10 },
    { hour: 10, minute: 25 },
    { hour: 12, minute: 40 },
    { hour: 15, minute: 15 },
    { hour: 17, minute: 35 },
    { hour: 19, minute: 5 }
  ];

  function nextSlot(dayOffset, index) {
    const slot = slots[index % slots.length];
    const date = new Date();

    date.setDate(date.getDate() + dayOffset);
    date.setHours(slot.hour, slot.minute, 0, 0);

    return date;
  }

  router.post("/google-posts/reschedule-approved", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        where: {
          status: {
            in: ["approved", "queued"]
          },
          googlePostName: null
        },
        include: {
          agency: true
        },
        orderBy: [
          { agencyId: "asc" },
          { createdAt: "asc" }
        ]
      });

      const agencyDayMap = {};
      let updated = 0;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        if (!post.agencyId) continue;

        if (!agencyDayMap[post.agencyId]) {
          agencyDayMap[post.agencyId] = 0;
        }

        const dayOffset = agencyDayMap[post.agencyId];
        const slotIndex = i + post.agencyId;

        const plannedAt = nextSlot(dayOffset, slotIndex);

        await prisma.googlePost.update({
          where: { id: post.id },
          data: {
            plannedAt,
            status: "approved"
          }
        });

        agencyDayMap[post.agencyId]++;
        updated++;
      }

      res.json({
        updated,
        message: "Posts approuvés replanifiés avec créneaux étalés."
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/google-posts/publish-due", async (req, res) => {
    try {
      const now = new Date();

      const posts = await prisma.googlePost.findMany({
        where: {
          status: "approved",
          googlePostName: null,
          plannedAt: {
            lte: now
          }
        },
        include: {
          agency: true
        },
        orderBy: {
          plannedAt: "asc"
        },
        take: 12
      });

      const alreadyPublishedToday = {};
      const results = [];

      for (const post of posts) {
        if (!post.agencyId) continue;

        if (alreadyPublishedToday[post.agencyId]) {
          results.push({
            id: post.id,
            skipped: true,
            reason: "agency_already_published_in_this_batch"
          });
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
          results.push({
            id: post.id,
            skipped: true,
            reason: "agency_already_published_today"
          });
          continue;
        }

        const publishRes = await fetch(
          `http://localhost:${process.env.PORT || 4000}/google-posts/${post.id}/publish-google`,
          { method: "POST" }
        );

        const data = await publishRes.json().catch(() => ({}));

        alreadyPublishedToday[post.agencyId] = true;

        results.push({
          id: post.id,
          agency: post.agency?.city,
          ok: publishRes.ok,
          data
        });
      }

      res.json({
        due: posts.length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
