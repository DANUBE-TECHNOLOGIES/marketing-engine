"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const createAdminRoutes=require("../src/modules/ambassade-fram/admin-routes");
test("FRAM admin mutation audit is emitted only after successful publication",async()=>{
 const router=createAdminRoutes({prisma:{framOffer:{
  findUnique:async()=>({id:"offer-1",status:"DRAFT",type:"VENTE_FLASH",title:"Flash",terms:"Conditions",startAt:new Date("2099-11-01"),endAt:new Date("2099-12-01"),updatedAt:new Date("2099-01-01")}),
  updateMany:async()=>({count:1})
 }},authorize:(_req,_res,next)=>next()});
 const route=router.stack.find(layer=>layer.route?.path==="/admin/ambassade-fram/offers/:id/publish");
 assert.ok(route);
 const logs=[];const previous=console.info;
 console.info=value=>logs.push(JSON.parse(value));
 try{
  const req={params:{id:"offer-1"},tenantId:"trusted",user:{role:"admin",authType:"fram-service-token"}};
  const res={json:()=>{},status(){return this;}};
  await route.route.stack[0].handle(req,res);
  assert.equal(logs.length,1);
  assert.equal(logs[0].action,"publish_offer");
  assert.equal(logs[0].tenantId,"trusted");
 }finally{console.info=previous;}
});
