const express = require("express");
const MarketingAutomationService = require("./service");
module.exports = ({ prisma }) => {
  const router = express.Router();
  const serviceFor = (req) => new MarketingAutomationService(prisma, req.tenantId);
  router.get("/marketing/health", (req, res) => res.json({ ok: true, version: "1.0.0", capability: "multichannel-marketing-automation" }));
  router.post("/marketing/render", (req, res, next) => { try { res.json(serviceFor(req).render(req.body || {})); } catch (error) { next(error); } });
  router.post("/marketing/campaign", async (req, res, next) => { try { res.status(201).json(await serviceFor(req).createCampaign(req.body || {})); } catch (error) { next(error); } });
  router.get("/marketing/campaign/:id", async (req, res, next) => { try { res.json(await serviceFor(req).getCampaign(req.params.id)); } catch (error) { next(error); } });
  router.get("/marketing/calendar", async (req, res, next) => { try { res.json(await serviceFor(req).calendar(req.query || {})); } catch (error) { next(error); } });
  return router;
};
