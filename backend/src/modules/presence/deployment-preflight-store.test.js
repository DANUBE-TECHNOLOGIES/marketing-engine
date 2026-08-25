"use strict";

const assert=require("node:assert/strict");
const test=require("node:test");
const {createPreflightId}=require("./deployment-preflight-store");

const readiness={generatedAt:"2026-08-25T08:00:00.000Z",migrations:{ready:true},catalog:{summary:{providers:12,present:12}},network:{agencyCount:7,googleListingCount:7},operational:{readyForGoogleApi:true,googleWritesEnabled:false},pilot:{readyForReadOnlyPreflight:true,readyForGooglePilot:false}};

test("preflight id is deterministic for the same readiness snapshot",()=>{
  assert.equal(createPreflightId(readiness),createPreflightId({...readiness}));
  assert.match(createPreflightId(readiness),/^preflight-[a-f0-9]{20}$/);
});

test("preflight id changes when the snapshot changes",()=>{
  assert.notEqual(createPreflightId(readiness),createPreflightId({...readiness,network:{agencyCount:7,googleListingCount:6}}));
});
