"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const createAdminRoutes=require("../src/modules/ambassade-fram/admin-routes");
const offer={id:"offer-1",status:"DRAFT",type:"VENTE_FLASH",title:"Flash",terms:"Conditions",startAt:new Date("2099-11-01"),endAt:new Date("2099-12-01"),updatedAt:new Date("2099-01-01")};
function fixture(write){
 const prisma={framOffer:{findUnique:async()=>offer,updateMany:async()=>({count:1})},framAdminAudit:{create:write}};
 const router=createAdminRoutes({prisma,authorize:(_req,_res,next)=>next()});
 const route=router.stack.find(layer=>layer.route?.path==="/admin/ambassade-fram/offers/:id/publish");
 return route.route.stack[0].handle;
}
test("FRAM publication writes a durable audit event",async()=>{
 const events=[];
 const handler=fixture(async input=>{events.push(input.data);});
 await handler({params:{id:"offer-1"},tenantId:"trusted",user:{role:"admin",authType:"fram-service-token"}},{json:()=>{},status(){return this;}});
 assert.equal(events.length,1);
 assert.deepEqual(events[0],{action:"publish_offer",target:"offer-1",tenantId:"trusted",actorType:"fram-service-token"});
});
test("audit database failure cannot turn committed publication into an API error",async()=>{
 const handler=fixture(async()=>{throw Error("database unavailable");});
 const previous=console.error;console.error=()=>{};
 let sent=false,code=200;
 try{
  await handler({params:{id:"offer-1"},tenantId:"trusted",user:{role:"admin"}},{json:()=>{sent=true;},status(value){code=value;return this;}});
  assert.equal(sent,true);assert.equal(code,200);
 }finally{console.error=previous;}
});
