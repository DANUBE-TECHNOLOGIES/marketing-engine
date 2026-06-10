const express = require("express");

module.exports = function createNetworkAutomationRoutes(prisma, PORT) {
  const router = express.Router();

  router.post("/automation/generate-network-actions", async (req, res) => {
    const actionsRes = await fetch(`http://localhost:${PORT}/agency-global-actions`);
    const data = await actionsRes.json();

    let created = 0;
    let existing = 0;

    for (const a of data.actions || []) {
      const found = await prisma.networkAction.findFirst({
        where: {
          agencyId: a.agencyId,
          lever: a.lever,
          status: { not: "done" }
        }
      });

      if (found) {
        existing++;
        continue;
      }

      await prisma.networkAction.create({
        data: {
          agencyId: a.agencyId,
          lever: a.lever,
          title: a.title,
          description: a.description,
          owner: "Sylvie",
          status: "todo",
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        }
      });

      created++;
    }

    res.json({
      detected: (data.actions || []).length,
      created,
      existing
    });
  });

  return router;
};
