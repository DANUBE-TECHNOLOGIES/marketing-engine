const express = require("express");

module.exports = function createReviewAutomationRoutes(prisma) {
  const router = express.Router();

  router.post("/reviews/check-network", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true
        },
        orderBy: {
          city: "asc"
        }
      });

      const created = [];
      const existing = [];

      for (const agency of agencies) {
        const reviews30 = agency.reviews.filter((review) => {
          return new Date(review.createdAt) > new Date(Date.now() - 30 * 86400000);
        }).length;

        if (reviews30 >= 3) {
          continue;
        }

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
          existing.push(already);
          continue;
        }

        const action = await prisma.networkAction.create({
          data: {
            agencyId: agency.id,
            lever: "reviews",
            title: "Obtenir davantage d'avis Google",
            description: `Seulement ${reviews30} avis sur les 30 derniers jours. Objectif minimum : 3 avis mensuels.`,
            owner: "Sylvie",
            status: "todo",
            deadline: new Date(Date.now() + 7 * 86400000)
          }
        });

        created.push(action);
      }

      res.json({
        totalAgencies: agencies.length,
        created: created.length,
        existing: existing.length,
        actions: created
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.get("/dashboard-alerts", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          reviews: true,
          googlePosts: true,
          networkActions: true
        },
        orderBy: {
          city: "asc"
        }
      });

      const alerts = [];

      for (const agency of agencies) {
        const reviews30 = agency.reviews.filter((review) => {
          return new Date(review.createdAt) > new Date(Date.now() - 30 * 86400000);
        }).length;

        const posts30 = agency.googlePosts.filter((post) => {
          return (
            post.status === "published" &&
            post.publishedAt &&
            new Date(post.publishedAt) > new Date(Date.now() - 30 * 86400000)
          );
        }).length;

        const openActions = agency.networkActions.filter((action) => {
          return ["todo", "in_progress"].includes(action.status);
        }).length;

        if (!agency.googleLocationId) {
          alerts.push({
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            type: "GOOGLE_NOT_CONFIGURED",
            priority: "high",
            message: "Fiche Google non configurée ou googleLocationId manquant."
          });
        }

        if (reviews30 < 3) {
          alerts.push({
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            type: "REVIEWS_LOW",
            priority: "medium",
            message: `${reviews30} avis Google sur les 30 derniers jours. Objectif : 3 minimum.`
          });
        }

        if (posts30 < 4) {
          alerts.push({
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            type: "POSTS_LOW",
            priority: "medium",
            message: `${posts30} Google Posts publiés sur les 30 derniers jours. Objectif : 4 minimum.`
          });
        }

        if (openActions > 5) {
          alerts.push({
            agencyId: agency.id,
            agencyName: agency.name,
            city: agency.city,
            type: "ACTIONS_HIGH",
            priority: "high",
            message: `${openActions} actions ouvertes.`
          });
        }
      }

      res.json({
        total: alerts.length,
        high: alerts.filter((a) => a.priority === "high").length,
        medium: alerts.filter((a) => a.priority === "medium").length,
        alerts
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
