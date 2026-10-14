"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const express=require("express");
const {createFramAdminAuth}=require("../src/modules/ambassade-fram/admin-auth");
const createFramAdminRoutes=require("../src/modules/ambassade-fram/admin-routes");
const secret="secure-token-"+ "x".repeat(40);

test("FRAM admin HTTP rejects anonymous and wrong tokens and ignores tenant spoofing",async()=>{
 const prisma={framOffer:{findMany:async()=>[]}};
 const app=express();
 app.use(createFramAdminRoutes({prisma,authorize:createFramAdminAuth({token:secret,tenantId:"trusted-tenant"})}));
 const server=app.listen(0,"127.0.0.1");
 try {
  await new Promise(resolve=>server.once("listening",resolve));
  const base="http://127.0.0.1:"+server.address().port+"/admin/ambassade-fram/offers";
  const anonymous=await fetch(base,{headers:{"x-tenant-id":"attacker"}});
  assert.equal(anonymous.status,401);
  const invalid=await fetch(base,{headers:{authorization:"Bearer "+"z".repeat(45)}});
  assert.equal(invalid.status,401);
  const valid=await fetch(base,{headers:{authorization:"Bearer "+secret,"x-tenant-id":"attacker"}});
  assert.equal(valid.status,200);
  assert.deepEqual(await valid.json(),[]);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
