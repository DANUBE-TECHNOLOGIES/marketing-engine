const knowledgeRoutes =
  require("../knowledge").routes;

const createAgencySeoModule =
  require("./agency-seo");

/**
 * Enregistre les runtimes modulaires Mondescale.
 */
function registerModules(app, context = {}) {
  if (!app) {
    throw new Error(
      "Une instance Express est obligatoire."
    );
  }

  const {
    prisma
  } = context;

  if (!prisma) {
    throw new Error(
      "Le client Prisma est obligatoire."
    );
  }

  app.use(
    "/knowledge",
    knowledgeRoutes
  );

  const agencySeo =
    createAgencySeoModule(prisma);

  app.use(
    "/agency-seo",
    agencySeo.routes
  );
}

module.exports = registerModules;
