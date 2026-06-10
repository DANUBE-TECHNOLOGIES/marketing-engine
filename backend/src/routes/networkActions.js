const express = require("express");

module.exports = function createNetworkActionsRoutes(prisma) {
  const router = express.Router();

  router.get("/network-actions", async (req, res) => {
    const actions = await prisma.networkAction.findMany({
      include: { agency: true },
      orderBy: [
        { status: "asc" },
        { deadline: "asc" },
        { createdAt: "desc" }
      ]
    });

    res.json({
      total: actions.length,
      todo: actions.filter((a) => a.status === "todo").length,
      inProgress: actions.filter((a) => a.status === "in_progress").length,
      done: actions.filter((a) => a.status === "done").length,
      actions
    });
  });

  router.post("/network-actions", async (req, res) => {
    const {
      agencyId,
      lever,
      title,
      description,
      owner,
      deadline,
      status,
      comment
    } = req.body;

    const action = await prisma.networkAction.create({
      data: {
        agencyId: agencyId ? Number(agencyId) : null,
        lever,
        title,
        description,
        owner,
        deadline: deadline ? new Date(deadline) : null,
        status: status || "todo",
        comment
      }
    });

    res.json(action);
  });

  router.patch("/network-actions/:id", async (req, res) => {
    const id = Number(req.params.id);

    const data = {};
    ["owner", "status", "comment", "lever", "title", "description"].forEach((key) => {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    });

    if (req.body.deadline !== undefined) {
      data.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    }

    const action = await prisma.networkAction.update({
      where: { id },
      data
    });

    res.json(action);
  });

  return router;
};
