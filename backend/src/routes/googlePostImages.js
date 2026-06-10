const express = require("express");

function detectImageCategory(post) {
  const text = `${post.title || ""} ${post.content || ""}`.toLowerCase();

  if (text.includes("croisi")) return "croisiere";
  if (text.includes("sur mesure")) return "surmesure";
  if (text.includes("destination") || text.includes("évasion")) return "destination";
  if (text.includes("équipe") || text.includes("conseill")) return "agence";
  if (text.includes("sécur") || text.includes("accompagnement")) return "conseil";

  return "voyage";
}

module.exports = function createGooglePostImagesRoutes(prisma) {
  const router = express.Router();

  router.post("/google-posts/assign-image-categories", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        where: {
          OR: [
            { imageCategory: null },
            { imageCategory: "" }
          ]
        },
        take: 500
      });

      let updated = 0;

      for (const post of posts) {
        const category = detectImageCategory(post);

        await prisma.googlePost.update({
          where: {
            id: post.id
          },
          data: {
            imageCategory: category
          }
        });

        updated++;
      }

      res.json({
        updated
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
