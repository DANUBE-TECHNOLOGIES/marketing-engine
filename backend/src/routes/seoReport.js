const express = require("express");

module.exports = function createSeoReportRoutes(prisma) {
  const router = express.Router();

  async function buildReport() {
    const rankingRes = await fetch("http://localhost:4000/seo-ranking");
    const ranking = await rankingRes.json();

    const actions = await prisma.networkAction.findMany({
      where: {
        status: {
          in: ["todo", "in_progress"]
        }
      },
      include: {
        agency: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    const rows = ranking.rows || [];

    const networkScore = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length)
      : 0;

    const top3 = rows.slice(0, 3);

    const progressions = [...rows]
      .filter((row) => Number(row.evolution || 0) > 0)
      .sort((a, b) => Number(b.evolution || 0) - Number(a.evolution || 0))
      .slice(0, 3);

    const regressions = [...rows]
      .filter((row) => Number(row.evolution || 0) < 0)
      .sort((a, b) => Number(a.evolution || 0) - Number(b.evolution || 0))
      .slice(0, 3);

    const weakest = [...rows]
      .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
      .slice(0, 3);

    const highActions = actions.filter((a) =>
      ["reviews", "citations", "seo-regression"].includes(a.lever)
    );

    const priorityActions = highActions.slice(0, 10).map((a) => ({
      id: a.id,
      city: a.agency?.city,
      agencyName: a.agency?.name,
      lever: a.lever,
      title: a.title,
      description: a.description,
      owner: a.owner,
      status: a.status,
      deadline: a.deadline
    }));

    const reportText = [
      "MONDESCALE SEO REPORT",
      "",
      `Score réseau : ${networkScore}/100`,
      `Actions ouvertes : ${actions.length}`,
      `Actions prioritaires : ${highActions.length}`,
      "",
      "Top agences :",
      ...top3.map((a, i) => `${i + 1}. ${a.city} — ${a.score}/100`),
      "",
      "Agences à surveiller :",
      ...weakest.map((a, i) => `${i + 1}. ${a.city} — ${a.score}/100`),
      "",
      "Progressions :",
      ...(progressions.length
        ? progressions.map((a, i) => `${i + 1}. ${a.city} +${a.evolution}`)
        : ["Aucune progression détectée"]),
      "",
      "Régressions :",
      ...(regressions.length
        ? regressions.map((a, i) => `${i + 1}. ${a.city} ${a.evolution}`)
        : ["Aucune régression détectée"]),
      "",
      "Actions prioritaires :",
      ...(priorityActions.length
        ? priorityActions.map((a) => `- ${a.city || "Réseau"} : ${a.title}`)
        : ["Aucune action prioritaire ouverte"])
    ].join("\n");

    return {
      ok: true,
      generatedAt: new Date(),
      networkScore,
      totalActions: actions.length,
      highActions: highActions.length,
      top3,
      weakest,
      progressions,
      regressions,
      priorityActions,
      reportText
    };
  }

  router.get("/seo-report/daily", async (req, res) => {
    try {
      const report = await buildReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  router.post("/seo-report/archive-today", async (req, res) => {
    try {
      const report = await buildReport();
      const today = new Date().toISOString().slice(0, 10);

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "SeoDailyReport"
        (
          "reportDate",
          "networkScore",
          "totalActions",
          "highActions",
          "reportText",
          "payload",
          "createdAt",
          "updatedAt"
        )
        VALUES
        ($1::date,$2,$3,$4,$5,$6::jsonb,NOW(),NOW())
        ON CONFLICT ("reportDate")
        DO UPDATE SET
          "networkScore" = EXCLUDED."networkScore",
          "totalActions" = EXCLUDED."totalActions",
          "highActions" = EXCLUDED."highActions",
          "reportText" = EXCLUDED."reportText",
          "payload" = EXCLUDED."payload",
          "updatedAt" = NOW()
        `,
        today,
        report.networkScore,
        report.totalActions,
        report.highActions,
        report.reportText,
        JSON.stringify(report)
      );

      res.json({
        ok: true,
        archived: true,
        reportDate: today,
        networkScore: report.networkScore,
        totalActions: report.totalActions,
        highActions: report.highActions
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  router.get("/seo-report/history", async (req, res) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          id,
          "reportDate",
          "networkScore",
          "totalActions",
          "highActions",
          "reportText",
          "createdAt",
          "updatedAt"
        FROM "SeoDailyReport"
        ORDER BY "reportDate" DESC
        LIMIT 60
      `);

      res.json({
        total: rows.length,
        rows
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  return router;
};
