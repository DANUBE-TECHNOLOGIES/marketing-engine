const test=require("node:test");
const assert=require("node:assert/strict");
const {createAdminService}=require("../src/modules/ambassade-fram/admin-service");
const offer={updatedAt:new Date("2099-10-01T00:00:00Z"),id:"o1",type:"EXCLUS_AMBASSADE",campaignMonth:"2099-11",status:"DRAFT",title:"Séjour",terms:"Sous réserve de disponibilité",startAt:new Date("2099-11-01"),endAt:new Date("2099-12-01")};
test("publication refuses absent terms",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,terms:null})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});
test("publication refuses stale status",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>offer,count:async()=>0,updateMany:async()=>({count:0})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});
test("publication updates one draft",async()=>{
 let filter;
 const service=createAdminService({framOffer:{findUnique:async()=>offer,count:async()=>0,updateMany:async args=>{filter=args.where;return {count:1}}}});
 await service.publishOffer("o1");
 assert.deepEqual(filter,{id:"o1",status:"DRAFT",updatedAt:offer.updatedAt,terms:offer.terms,campaignMonth:offer.campaignMonth,startAt:offer.startAt,endAt:offer.endAt});
});

test("publication rejects non-text terms",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,terms:123})}});
 await assert.rejects(service.publishOffer("o1"),RangeError);
});

test("publication rejects expired offers",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({...offer,startAt:new Date("2025-12-01"),endAt:new Date("2026-01-01")})}});
 await assert.rejects(service.publishOffer("o1"),/Expired offers/);
});

test("publication refuses a fifth monthly exclusive",async()=>{
 const service=createAdminService({framOffer:{
  findUnique:async()=>offer,
  count:async()=>4,
  updateMany:async()=>{throw Error("Must not publish fifth offer");}
 }});
 await assert.rejects(service.publishOffer("o1"),/Maximum four monthly exclusives/);
});

test("publication permits a fourth monthly exclusive",async()=>{
 let updated=false;
 const service=createAdminService({framOffer:{
  findUnique:async()=>offer,
  count:async()=>3,
  updateMany:async()=>{updated=true;return {count:1};}
 }});
 await service.publishOffer("o1");
 assert.equal(updated,true);
});
test("flash sales do not consume monthly exclusive capacity",async()=>{
 const flash={...offer,type:"VENTE_FLASH",campaignMonth:null};
 let updated=false;
 const service=createAdminService({framOffer:{
  findUnique:async()=>flash,
  count:async()=>{throw Error("Flash must not check monthly capacity");},
  updateMany:async()=>{updated=true;return {count:1};}
 }});
 await service.publishOffer("o1");
 assert.equal(updated,true);
});
