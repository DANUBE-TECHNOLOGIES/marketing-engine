const express = require("express");

module.exports = function createRankingsRoutes(prisma, PORT, rankingKeywords) {
  const router = express.Router();

  router.get("/rankings", async (req, res) => {
    const agencies = await prisma.agency.findMany({
      orderBy: { city: "asc" }
    });

    const rankings = agencies.map((agency, agencyIndex) => {
      const keywords = rankingKeywords.map((keyword, keywordIndex) => {
        const simulatedPosition =
          ((agencyIndex + 1) * (keywordIndex + 2)) % 20 + 1;

        let trend = "stable";

        if (simulatedPosition <= 3) trend = "up";
        else if (simulatedPosition >= 10) trend = "down";

        return {
          keyword,
          position: simulatedPosition,
          trend
        };
      });

      const averagePosition = Math.round(
        keywords.reduce((sum, k) => sum + k.position, 0) /
        Math.max(keywords.length, 1)
      );

      return {
        agencyId: agency.id,
        agencyName: agency.name,
        city: agency.city,
        averagePosition,
        keywords
      };
    });

    res.json({
      keywords: rankingKeywords.length,
      agencies: rankings.length,
      rankings
    });
  });

  router.get("/rankings/export", async (req, res) => {
    const rankingsRes = await fetch(`http://localhost:${PORT}/rankings`);
    const data = await rankingsRes.json();

    const header = "Agence;Ville;Mot-clé;Position;Tendance";
    const rows = [];

    data.rankings.forEach((agency) => {
      agency.keywords.forEach((keyword) => {
        rows.push([
          agency.agencyName,
          agency.city,
          keyword.keyword,
          keyword.position,
          keyword.trend
        ]);
      });
    });

    const csvRows = rows.map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=rankings.csv");
    res.send("\uFEFF" + [header, ...csvRows].join("\n"));
  });

  router.get("/rankings/:agencyId", async (req, res) => {
    const rankingsRes = await fetch(`http://localhost:${PORT}/rankings`);
    const data = await rankingsRes.json();

    const agency = data.rankings.find(
      (a) => a.agencyId === Number(req.params.agencyId)
    );

    if (!agency) {
      return res.status(404).json({ error: "Agency ranking not found" });
    }

    res.json(agency);
  });

  return router;
};
