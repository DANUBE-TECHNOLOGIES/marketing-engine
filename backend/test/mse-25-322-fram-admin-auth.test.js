"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {createFramAdminAuth} = require("../src/modules/ambassade-fram/admin-auth");
const token = "a".repeat(48);
const makeResponse = () => ({ code:0, status(code){this.code=code;return this;}, json(value){this.body=value;return this;} });
test("admin auth refuses missing or weak server configuration",()=>{
 assert.throws(()=>createFramAdminAuth({token:"short",tenantId:"t"}),/secret/);
 assert.throws(()=>createFramAdminAuth({token,tenantId:""}),/tenant/);
});
test("admin auth rejects missing and incorrect bearer credentials",()=>{
 const gate=createFramAdminAuth({token,tenantId:"trusted"});
 for(const value of [undefined,"Basic abc","Bearer wrong","Bearer "+"b".repeat(48)]) {
  const res=makeResponse();
  gate({get:()=>value,headers:{"x-tenant-id":"attacker"}},res,()=>{throw Error("unexpected authorization");});
  assert.equal(res.code,401);
 }
});
test("admin auth binds server tenant and admin role, not client headers",()=>{
 const gate=createFramAdminAuth({token,tenantId:"trusted"});
 const req={get:()=> "Bearer "+token,headers:{"x-tenant-id":"attacker"},tenantId:"attacker",user:{role:"viewer"}};
 const res=makeResponse();let nextCalled=false;
 gate(req,res,()=>{nextCalled=true;});
 assert.equal(nextCalled,true);
 assert.equal(req.tenantId,"trusted");
 assert.equal(req.user.role,"admin");
 assert.equal(req.framAdminAuthenticated,true);
});

test("admin auth refuses bearer token with a trailing newline",()=>{
 const gate=createFramAdminAuth({token,tenantId:"trusted"});
 const res=makeResponse();
 gate({get:()=> "Bearer "+token+"\\n"},res,()=>{throw Error("unexpected authorization");});
 assert.equal(res.code,401);
});
