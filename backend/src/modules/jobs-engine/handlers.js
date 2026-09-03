"use strict";

const { createPublicationService } = require("../publication-engine/service");

function registerCoreHandlers(registry, prisma) {
  registry.register("publication.run-due", async ({ payload }) => {
    const publication = createPublicationService(prisma);
    return publication.runDue({ limit: payload.limit || 50 });
  });

  registry.register("system.echo", async ({ payload }) => ({ echoed: payload }));

  return registry;
}

module.exports = { registerCoreHandlers };
