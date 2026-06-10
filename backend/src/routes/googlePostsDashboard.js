const express = require("express");

module.exports = function createGooglePostsDashboardRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts-dashboard", async (req, res) => {
    try {
      const agencies = await prisma.agency.findMany({
        include: {
          googlePosts: true
        },
        orderBy: {
          city: "asc"
        }
      });

      const daysAgo = (days) =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = agencies.map((agency) => {
        const posts = agency.googlePosts || [];

        const published30 = posts.filter((p) =>
          p.status === "published" &&
          p.publishedAt &&
          new Date(p.publishedAt) >= daysAgo(30)
        );

        const lastPublished = posts
          .filter((p) => p.publishedAt)
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];

        const draft = posts.filter((p) => p.status === "draft").length;
        const approved = posts.filter((p) => p.status === "approved").length;
        const queued = posts.filter((p) => p.status === "queued").length;
        const published = posts.filter((p) => p.status === "published").length;
        const error = posts.filter((p) => p.status === "error").length;

        let status = "OK";

        if (error > 0) status = "ERREUR";
        else if (published30.length < 4) status = "SOUS_ACTIVITE";
        else if (draft > 15) status = "TROP_DE_BROUILLONS";
        else if (approved > 10) status = "A_METTRE_EN_FILE";

        return {
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          draft,
          approved,
          queued,
          published,
          published30: published30.length,
          error,
          lastPublishedAt: lastPublished?.publishedAt || null,
          status
        };
      });

      res.json({
        totalAgencies: rows.length,
        totalDraft: rows.reduce((s, r) => s + r.draft, 0),
        totalApproved: rows.reduce((s, r) => s + r.approved, 0),
        totalQueued: rows.reduce((s, r) => s + r.queued, 0),
        totalPublished: rows.reduce((s, r) => s + r.published, 0),
        totalErrors: rows.reduce((s, r) => s + r.error, 0),
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
