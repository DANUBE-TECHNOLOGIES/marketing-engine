"use strict";
const express = require("express");
const MiniSiteBuilderService = require("./service");
module.exports = ({ prisma }) => {
  const router = express.Router();
  const serviceFor = req => new MiniSiteBuilderService(prisma, req.tenantId);
  router.get("/builder/health", (req,res) => res.json(serviceFor(req).health()));
  router.get("/builder/pages/:pageId/blocks", async (req,res,next)=>{ try{res.json(await serviceFor(req).list(req.params.pageId));}catch(e){next(e);} });
  router.post("/builder/pages/:pageId/blocks", async (req,res,next)=>{ try{res.status(201).json(await serviceFor(req).create(req.params.pageId,req.body||{}));}catch(e){next(e);} });
  router.put("/builder/blocks/:id", async (req,res,next)=>{ try{res.json(await serviceFor(req).update(req.params.id,req.body||{}));}catch(e){next(e);} });
  router.delete("/builder/blocks/:id", async (req,res,next)=>{ try{res.json(await serviceFor(req).remove(req.params.id));}catch(e){next(e);} });
  router.post("/builder/pages/:pageId/blocks/reorder", async (req,res,next)=>{ try{res.json(await serviceFor(req).reorder(req.params.pageId,req.body||{}));}catch(e){next(e);} });
  router.get("/builder/pages/:pageId/render", async (req,res,next)=>{ try{res.type("html").send(await serviceFor(req).render(req.params.pageId));}catch(e){next(e);} });
  return router;
};
