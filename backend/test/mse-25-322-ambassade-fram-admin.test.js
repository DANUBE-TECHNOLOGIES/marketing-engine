const test=require("node:test");
const assert=require("node:assert/strict");
const {sanitizeOffer,createAdminService}=require("../src/modules/ambassade-fram/admin-service");
const draft={type:"EXCLUS_AMBASSADE",status:"DRAFT",title:" Offre ",startAt:"2026-10-01",endAt:"2026-11-01"};
test("sanitize draft and reject injected fields",()=>{
 const clean=sanitizeOffer(draft);
 assert.equal(clean.title,"Offre");
 assert.ok(clean.startAt instanceof Date);
 assert.throws(()=>sanitizeOffer({...draft,agencyId:1}));
});
test("create cannot directly publish",async()=>{
 const service=createAdminService({framOffer:{create:()=>{throw Error("must not create")}}});
 await assert.rejects(()=>service.createOffer({...draft,status:"PUBLISHED"}));
});
test("draft creation uses sanitized payload",async()=>{
 let saved;
 const service=createAdminService({framOffer:{create:async ({data})=>(saved=data)}});
 await service.createOffer(draft);
 assert.equal(saved.status,"DRAFT");
 assert.equal(saved.title,"Offre");
});
test("published offer cannot be overwritten through draft editor",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({status:"PUBLISHED"}),update:()=>{throw Error("must not update")}}});
 await assert.rejects(()=>service.replaceDraft("offer-1",draft));
});
