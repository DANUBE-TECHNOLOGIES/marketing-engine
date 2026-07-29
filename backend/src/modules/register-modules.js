const assetEngine = require("./asset-engine");
const createAgencySeoModule = require("./agency-seo");
const miniSite = require("./mini-site");
const seoFactory = require("./seo-factory");
const contentComposer = require("./content-composer");
const destinationEngine = require("./destination-engine");

const platformCore = require("./platform-core");
const aiPlatform = require("./ai-platform");
const seoPlatform = require("./seo-platform");

const knowledgeGraph = require("./knowledge-graph");
const agencySite = require("./agency-site");
const contentQuality = require("./content-quality");
const marketingAutomation = require("./marketing-automation");
const editorialCalendar = require("./editorial-calendar");
const publishers = require("./publishers");
module.exports = function registerModules(app, { prisma }) {
  if (destinationEngine.routes) {
    app.use(destinationEngine.routes({ prisma }));
  }

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


  if (contentQuality.routes) {
    app.use(contentQuality.routes({ prisma }));
  }

  if (marketingAutomation.routes) {
    app.use(marketingAutomation.routes({ prisma }));
  }

  if (editorialCalendar.routes) {
    app.use(editorialCalendar.routes({ prisma }));
  }

  if (publishers.googleBusiness?.routes) {
    app.use(publishers.googleBusiness.routes({ prisma }));
  }

  if (agencySite.routes) {
    app.use(agencySite.routes({ prisma }));
  }
};
