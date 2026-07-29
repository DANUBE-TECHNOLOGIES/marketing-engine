"use strict";
const express=require("express"); const {compose}=require("./service");
module.exports=()=>{const router=express.Router();router.get("/content-composer/health",(_req,res)=>res.json({ok:true,featurePack:"FP-007",module:"content-composer",version:"0.1.1"}));router.post("/content-composer/preview",(req,res,next)=>{try{res.json({ok:true,document:compose(req.body||{})});}catch(e){next(e);}});return router;};
