const express = require("express");

function isQualityPost(post) {
  
if (!post.agencyId) return false;

if((post.seoScore || 0) < 60){
return false;
}

  if (!post.title || post.title.length < 20) return false;
  if (!post.content || post.content.length < 250) return false;
  if (!post.ctaLabel || !post.ctaUrl) return false;
  if (post.googlePostName) return false;

  return true;
}

module.exports = function createGooglePostsAutoApprovalRoutes(prisma) {
  const router = express.Router();

  router.post("/google-posts/auto-approve-quality", async (req, res) => {
    try {
      const max = Number(req.body.max || 100);

      const posts = await prisma.googlePost.findMany({
        where: {
          status: "draft",
          googlePostName: null
        },
        include: {
          agency: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: max
      });

      let approved = 0;
      const rejected = [];

      for (const post of posts) {
        if (!isQualityPost(post)) {
          rejected.push({
            id: post.id,
            title: post.title,
            reason: "quality_check_failed"
          });
          continue;
        }

        await prisma.googlePost.update({
          where: {
            id: post.id
          },
          data: {
            status: "approved"
          }
        });

        approved++;
      }

      res.json({
        scanned: posts.length,
        approved,
        rejected: rejected.length,
        rejectedPosts: rejected.slice(0, 20)
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
