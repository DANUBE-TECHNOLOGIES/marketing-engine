"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const createAdminRoutes=require("../src/modules/ambassade-fram/admin-routes");
const offer={id:"offer-1",status:"DRAFT",type:"VENTE_FLASH",title:"Flash",terms:"Conditions",startAt:new Date("2099-11-01"),endAt:new Date("2099-12-01"),updatedAt:new Date("2099-01-01")};
function fixture(write){
 let committed=false;
 const tx={framOffer:{findUnique:async()=>offer,updateMany:async()=>({count:1})},framAdminAudit:{create:write}};
 const prisma={framAdminAudit:tx.framAdminAudit,$transaction:async fn=>{const result=await fn(tx);committed=true;return result;}};
 const router=createAdminRoutes({prisma,authorize:(_req,_res,next)=>next()});
 const route=router.stack.find(layer=>layer.route?.path==="/admin/ambassade-fram/offers/:id/publish");
 return {handler:route.route.stack[0].handle,committed:()=>committed};
}
const req={params:{id:"offer-1"},tenantId:"trusted",user:{role:"admin",authType:"fram-service-token"}};
test("FRAM publication commits only with durable audit event",async()=>{
 const events=[];
 const {handler,committed}=fixture(async input=>events.push(input.data));
 let status=200;
 await handler(req,{json:()=>{},status(n){status=n;return this;}});
 assert.equal(status,200);
 assert.equal(committed(),true);
 assert.deepEqual(events,[{action:"publish_offer",target:"offer-1",tenantId:"trusted",actorType:"fram-service-token"}]);
});
test("FRAM audit failure aborts publication transaction and returns unavailable",async()=>{
 const {handler,committed}=fixture(async()=>{throw Error("audit unavailable");});
 const previous=console.error;console.error=()=>{};
 let status=200;
 try{
  await handler(req,{json:()=>{},status(n){status=n;return this;}});
  assert.equal(status,503);
  assert.equal(committed(),false);
 }finally{console.error=previous;}
});
