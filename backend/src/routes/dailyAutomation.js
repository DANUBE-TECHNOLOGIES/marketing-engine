const express = require("express");

module.exports = function createDailyAutomationRoutes(prisma, PORT) {
  const router = express.Router();

  async function runStep(name, url, method = "POST", body = null) {
    const startedAt = new Date();

    try {
      const options = { method };

      if (body) {
        options.headers = {
          "Content-Type": "application/json"
        };
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      return {
        name,
        ok: res.ok,
        status: res.status,
        durationMs: new Date() - startedAt,
        data
      };
    } catch (error) {
      return {
        name,
        ok: false,
        status: 500,
        durationMs: new Date() - startedAt,
        error: error.message
      };
    }
  }

  router.post("/automation/daily-run", async (req, res) => {
    try {
      const base = `http://localhost:${PORT || process.env.PORT || 4000}`;
      const steps = [];

      steps.push(await runStep("seo_snapshot", `${base}/seo-history/snapshot`));
      steps.push(await runStep("reviews_check_network", `${base}/reviews/check-network`));
      steps.push(await runStep("citations_generate_actions", `${base}/citations/generate-actions`));
      steps.push(await runStep("seo_actions_generate", `${base}/seo-actions/generate`));
      steps.push(await runStep("seo_regression_check", `${base}/seo-regression-check`));
      steps.push(await runStep("google_posts_block_similar", `${base}/google-posts/block-similar`, "POST", { threshold: 55 }));
      steps.push(await runStep("google_posts_publish_due", `${base}/google-posts/publish-due`));
      steps.push(await runStep("seo_report_archive", `${base}/seo-report/archive-today`));
      steps.push(await runStep("seo_email_daily", `${base}/seo-email/send-daily`));

      const ok = steps.every((s) => s.ok);

      const openActions = await prisma.networkAction.count({
        where: {
          status: {
            in: ["todo", "in_progress"]
          }
        }
      });

      const highActions = await prisma.networkAction.count({
        where: {
          status: {
            in: ["todo", "in_progress"]
          },
          lever: {
            in: ["reviews", "citations", "seo-regression"]
          }
        }
      });

      res.json({
        ok,
        ranAt: new Date(),
        openActions,
        highActions,
        steps
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  router.get("/automation/status", async (req, res) => {
    try {
      const actions = await prisma.networkAction.findMany({
        include: {
          agency: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      });

      const open = actions.filter((a) =>
        ["todo", "in_progress"].includes(a.status)
      );

      res.json({
        totalRecent: actions.length,
        open: open.length,
        done: actions.filter((a) => a.status === "done").length,
        reviews: open.filter((a) => a.lever === "reviews").length,
        citations: open.filter((a) => a.lever === "citations").length,
        googlePosts: open.filter((a) =>
          ["google_posts", "google-posts"].includes(a.lever)
        ).length,
        seoRegression: open.filter((a) => a.lever === "seo-regression").length,
        actions: actions.map((a) => ({
          id: a.id,
          agencyId: a.agencyId,
          agencyName: a.agency?.name,
          city: a.agency?.city,
          lever: a.lever,
          title: a.title,
          description: a.description,
          owner: a.owner,
          status: a.status,
          deadline: a.deadline,
          createdAt: a.createdAt
        }))
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
};
