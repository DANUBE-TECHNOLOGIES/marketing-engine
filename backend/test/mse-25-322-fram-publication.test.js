const test=require("node:test");
const assert=require("node:assert/strict");
const {createAdminService}=require("../src/modules/ambassade-fram/admin-service");
const offer={id:"o1",type:"EXCLUS_AMBASSADE",campaignMonth:"2099-11",status:"DRAFT",title:"Séjour",terms:"Sous réserve de disponibilité",startAt:new Date("2099-11-01"),endAt:new Date("2099-12-01")};
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
 assert.deepEqual(filter,{id:"o1",status:"DRAFT",terms:offer.terms,campaignMonth:offer.campaignMonth,startAt:offer.startAt,endAt:offer.endAt});
});

test("publication rejects non-text terms",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,terms:123})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});

test("publication rejects expired offers",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,startAt:new Date("2025-12-01"),endAt:new Date("2026-01-01")})}});
 await assert.rejects(service.publishOffer("o1"),/Expired offers/);
});
