"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {createAdminService} = require("../src/modules/ambassade-fram/admin-service");
const updatedAt = new Date("2026-10-14T10:00:00Z");
test("withdrawal archives an active offer with revision guard",async()=>{
 let filter,change;
 const service=createAdminService({framOffer:{
  findUnique:async()=>({id:"o1",status:"PUBLISHED",updatedAt}),
  updateMany:async ({where,data})=>{filter=where;change=data;return {count:1};}
 }});
 await service.archiveOffer("o1");
 assert.deepEqual(filter,{id:"o1",status:"PUBLISHED",updatedAt});
 assert.deepEqual(change,{status:"ARCHIVED"});
});
test("withdrawal refuses an already archived offer",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>({status:"ARCHIVED"})}});
 await assert.rejects(service.archiveOffer("o1"),/Cannot archive/);
});
test("withdrawal refuses a stale offer",async()=>{
 const service=createAdminService({framOffer:{
  findUnique:async()=>({status:"PUBLISHED",updatedAt}),
  updateMany:async()=>({count:0})
 }});
 await assert.rejects(service.archiveOffer("o1"),/Archive conflict/);
});

test("withdrawal rejects missing identifiers before database access",async()=>{
 const service=createAdminService({framOffer:{findUnique:async()=>{throw Error("Unexpected database access");}}});
 await assert.rejects(service.archiveOffer(""),/Invalid offer id/);
 await assert.rejects(service.archiveOffer(null),/Invalid offer id/);
});
