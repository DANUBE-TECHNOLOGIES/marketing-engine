const express = require("express");
const fs = require("fs");
const path = require("path");

const categories = [
  "croisiere",
  "surmesure",
  "destination",
  "agence",
  "conseil",
  "voyage"
];

function getImages(category) {
  const dir = path.join(
    "/app",
    "..",
    "frontend",
    "public",
    "google-post-images",
    category
  );

  try {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir)
      .filter((file) =>
        [".jpg", ".jpeg", ".png", ".webp"].includes(
          path.extname(file).toLowerCase()
        )
      )
      .map((file) => `/google-post-images/${category}/${file}`);
  } catch {
    return [];
  }
}

module.exports = function createGooglePostImageLibraryRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts/image-library", async (req, res) => {
    const library = {};

    categories.forEach((category) => {
      library[category] = getImages(category);
    });

    res.json(library);
  });

  router.post("/google-posts/assign-images", async (req, res) => {
    try {
      const posts = await prisma.googlePost.findMany({
        where: {
          OR: [
            { imageUrl: null },
            { imageUrl: "" }
          ]
        },
        take: 500
      });

      let updated = 0;
      const missing = [];

      for (const post of posts) {
        const category =
          post.imageCategory ||
          "voyage";

        const images =
          getImages(category);

        if (!images.length) {
          missing.push({
            postId: post.id,
            category
          });
          continue;
        }

        const image =
          images[post.id % images.length];

        await prisma.googlePost.update({
          where: { id: post.id },
          data: {
            imageCategory: category,
            imageUrl: image
          }
        });

        updated++;
      }

      res.json({
        updated,
        missing
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
