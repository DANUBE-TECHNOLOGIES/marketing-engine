"use strict";
const express=require("express");
const sdk=require("../../sdk");
module.exports=({prisma})=>{
 const router=express.Router();
 router.get("/platform-core/health",async(_req,res,next)=>{
  try{
   let database="not-checked";
   if(prisma&&typeof prisma.$queryRaw==="function"){await prisma.$queryRaw`SELECT 1`;database="ok";}
   res.json({ok:true,platformVersion:sdk.version,apiVersion:sdk.config.platform.apiVersion,environment:sdk.config.platform.environment,database,cache:sdk.cache.stats(),services:sdk.registry.describe().length});
  }catch(error){next(error);}
 });
 router.get("/platform-core/services",(_req,res)=>res.json({services:sdk.registry.describe()}));
 router.get("/platform-core/capabilities",(_req,res)=>res.json({capabilities:[...new Set(sdk.registry.describe().flatMap(s=>s.capabilities))].sort(),domains:sdk.contracts.domains}));
 router.get("/platform-core/events",(req,res)=>res.json({events:sdk.events.recent(req.query.limit)}));
 router.post("/platform-core/events",(req,res,next)=>{try{res.status(201).json(sdk.events.publish(req.body?.name,req.body?.payload,{source:req.body?.source||"api"}));}catch(error){next(error);}});
 return router;
};
