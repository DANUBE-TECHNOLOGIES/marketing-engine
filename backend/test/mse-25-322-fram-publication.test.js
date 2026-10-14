const test=require("node:test");
const assert=require("node:assert/strict");
const {createAdminService}=require("../src/modules/ambassade-fram/admin-service");
const offer={id:"o1",type:"EXCLUS_AMBASSADE",status:"DRAFT",title:"Séjour",terms:"Sous réserve de disponibilité",startAt:new Date("2026-11-01"),endAt:new Date("2026-12-01")};
test("publication refuses absent terms",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,terms:null})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});
test("publication refuses stale status",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>offer,updateMany:async()=>({count:0})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});
test("publication updates one draft",async()=>{
 let filter;
 const service=createAdminService({framOffer:{findUnique:async()=>offer,updateMany:async args=>{filter=args.where;return {count:1}}}});
 await service.publishOffer("o1");
 assert.deepEqual(filter,{id:"o1",status:"DRAFT"});
});
