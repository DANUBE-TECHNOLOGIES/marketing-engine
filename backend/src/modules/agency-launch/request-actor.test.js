"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const{requestActor}=require("./request-actor");
test("prefers native authenticated user",()=>{assert.equal(requestActor({user:{email:"nicolas@example.test"}},{TRUST_IDENTITY_HEADERS:"false"}),"nicolas@example.test")});
test("rejects identity headers unless explicitly trusted",()=>{const req={headers:{"x-forwarded-user":"proxy-user"}};assert.equal(requestActor(req,{TRUST_IDENTITY_HEADERS:"false"}),null);assert.equal(requestActor(req,{TRUST_IDENTITY_HEADERS:"true"}),"proxy-user")});
test("native identity wins over proxy header",()=>{const req={user:{name:"Native User"},headers:{"x-user":"Proxy User"}};assert.equal(requestActor(req,{TRUST_IDENTITY_HEADERS:"true"}),"Native User")});