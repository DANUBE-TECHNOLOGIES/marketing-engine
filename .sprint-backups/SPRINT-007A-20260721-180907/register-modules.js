const assetEngine = require("./asset-engine");
const createAgencySeoModule = require("./agency-seo");
const miniSite = require("./mini-site");
const seoFactory = require("./seo-factory");
const contentComposer = require("./content-composer");

const platformCore = require("./platform-core");
const aiPlatform = require("./ai-platform");
const seoPlatform = require("./seo-platform");

const knowledgeGraph = require("./knowledge-graph");
module.exports = function registerModules(app, { prisma }) {
  if (seoPlatform.routes) app.use(seoPlatform.routes({ prisma }));

  if (aiPlatform.routes) app.use(aiPlatform.routes({ prisma }));

  if (platformCore.routes) {
    app.use(platformCore.routes({ prisma }));
  }

  if (assetEngine.routes) {
    app.use(assetEngine.routes({ prisma }));
  }

  // agency-seo exporte une factory et non un objet { routes }.
  const agencySeo = createAgencySeoModule(prisma);
  if (agencySeo.routes) {
    app.use(agencySeo.routes);
  }

  if (miniSite.routes) {
    app.use(miniSite.routes({ prisma }));
  }

  if (seoFactory.routes) {
    app.use(seoFactory.routes({ prisma }));
  }

  if (contentComposer.routes) {
    app.use(contentComposer.routes({ prisma }));
  }
  // Knowledge Graph — Sprint 006
  if (knowledgeGraph.routes) {
    app.use(knowledgeGraph.routes({ prisma }));
  }

};
