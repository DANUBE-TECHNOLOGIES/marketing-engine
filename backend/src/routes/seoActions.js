const express = require("express");

module.exports = function createSeoActionsRoutes(prisma) {
  const router = express.Router();

  router.post("/seo-actions/generate", async (req, res) => {
    try {
      let created = 0;
      let existing = 0;

      const citationRows = await prisma.$queryRawUnsafe(`
        SELECT
          a.id AS "agencyId",
          a.city,
          COUNT(dl.id)::int AS missing,
          MAX(d."impactScore")::int AS maxImpact
        FROM "Agency" a
        JOIN "DirectoryListing" dl ON dl."agencyId" = a.id
        JOIN "LocalDirectory" d ON d.id = dl."directoryId"
        WHERE d.active = TRUE
        AND dl.status IN ('missing','error')
        GROUP BY a.id, a.city
      `);

      for (const row of citationRows) {
        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: Number(row.agencyId),
            lever: "citations",
            status: { in: ["todo", "in_progress"] }
          }
        });

        if (already) {
          existing++;
        } else {
          await prisma.networkAction.create({
            data: {
              agencyId: Number(row.agencyId),
              lever: "citations",
              title: "Renforcer les citations locales",
              description: `${row.missing} citation(s) manquante(s). Priorité : Bing Places, Apple Business Connect, Facebook, PagesJaunes, OpenStreetMap.`,
              owner: "Sylvie",
              status: "todo",
              deadline: new Date(Date.now() + 14 * 86400000)
            }
          });

          created++;
        }
      }

      const reviewRows = await prisma.$queryRawUnsafe(`
        SELECT
          a.id AS "agencyId",
          a.city,
          COUNT(r.id) FILTER (
            WHERE r."createdAt" >= NOW() - INTERVAL '30 days'
          )::int AS reviews30
        FROM "Agency" a
        LEFT JOIN "GoogleReview" r ON r."agencyId" = a.id
        GROUP BY a.id, a.city
      `);

      for (const row of reviewRows) {
        if (Number(row.reviews30) >= 3) continue;

        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: Number(row.agencyId),
            lever: "reviews",
            status: { in: ["todo", "in_progress"] }
          }
        });

        if (already) {
          existing++;
        } else {
          await prisma.networkAction.create({
            data: {
              agencyId: Number(row.agencyId),
              lever: "reviews",
              title: "Collecter des avis Google",
              description: `${row.reviews30} avis sur les 30 derniers jours. Objectif minimum : 3 avis mensuels.`,
              owner: "Sylvie",
              status: "todo",
              deadline: new Date(Date.now() + 7 * 86400000)
            }
          });

          created++;
        }
      }

      const postRows = await prisma.$queryRawUnsafe(`
        SELECT
          a.id AS "agencyId",
          a.city,
          COUNT(p.id) FILTER (
            WHERE p.status = 'published'
            AND p."publishedAt" >= NOW() - INTERVAL '30 days'
          )::int AS published30,
          COUNT(p.id) FILTER (
            WHERE p.status = 'approved'
          )::int AS approved
        FROM "Agency" a
        LEFT JOIN "GooglePost" p ON p."agencyId" = a.id
        GROUP BY a.id, a.city
      `);

      for (const row of postRows) {
        if (Number(row.published30) >= 4 || Number(row.approved) > 0) continue;

        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: Number(row.agencyId),
            lever: "google_posts",
            status: { in: ["todo", "in_progress"] }
          }
        });

        if (already) {
          existing++;
        } else {
          await prisma.networkAction.create({
            data: {
              agencyId: Number(row.agencyId),
              lever: "google_posts",
              title: "Préparer des Google Posts",
              description: `${row.published30} post(s) publié(s) sur 30 jours. Objectif : maintenir une présence régulière sans duplication.`,
              owner: "Sylvie",
              status: "todo",
              deadline: new Date(Date.now() + 5 * 86400000)
            }
          });

          created++;
        }
      }

      res.json({
        ok: true,
        created,
        existing
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/seo-actions", async (req, res) => {
    try {
      const actions = await prisma.$queryRawUnsafe(`
        SELECT
          na.id,
          na."agencyId",
          a.name AS "agencyName",
          a.city,
          na.lever,
          na.title,
          na.description,
          na.owner,
          na.status,
          na.deadline,
          na."createdAt",
          CASE
            WHEN na.status = 'done' THEN 'DONE'
            WHEN na.lever = 'reviews' THEN 'HIGH'
            WHEN na.lever = 'citations' THEN 'HIGH'
            WHEN na.lever = 'google_posts' THEN 'MEDIUM'
            ELSE 'LOW'
          END AS priority,
          CASE
            WHEN na.lever = 'reviews' THEN 12
            WHEN na.lever = 'citations' THEN 10
            WHEN na.lever = 'google_posts' THEN 8
            ELSE 3
          END AS "estimatedGain"
        FROM "NetworkAction" na
        LEFT JOIN "Agency" a ON a.id = na."agencyId"
        WHERE na.status IN ('todo','in_progress','done')
        ORDER BY
          CASE
            WHEN na.status = 'done' THEN 9
            WHEN na.lever = 'reviews' THEN 1
            WHEN na.lever = 'citations' THEN 2
            WHEN na.lever = 'google_posts' THEN 3
            ELSE 4
          END,
          na.deadline ASC NULLS LAST,
          na."createdAt" DESC
      `);

      res.json({
        total: actions.length,
        open: actions.filter((a) => a.status !== "done").length,
        done: actions.filter((a) => a.status === "done").length,
        high: actions.filter((a) => a.priority === "HIGH" && a.status !== "done").length,
        medium: actions.filter((a) => a.priority === "MEDIUM" && a.status !== "done").length,
        low: actions.filter((a) => a.priority === "LOW" && a.status !== "done").length,
        actions
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/seo-actions/:id/done", async (req, res) => {
    try {
      const id = Number(req.params.id);

      const updated = await prisma.networkAction.update({
        where: { id },
        data: {
          status: "done"
        }
      });

      res.json({
        ok: true,
        action: updated
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
