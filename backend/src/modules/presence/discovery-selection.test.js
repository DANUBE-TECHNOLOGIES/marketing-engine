"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {selectCandidate}=require("./discovery-routes");

test("discovery selects requested candidate instead of silently taking first",()=>{
  const candidates=[{url:"https://example.test/a",score:95},{url:"https://example.test/b",score:88}];
  assert.equal(selectCandidate(candidates,"https://example.test/b").url,"https://example.test/b");
});

test("discovery rejects URL that is not part of ranked candidates",()=>{
  const candidates=[{url:"https://example.test/a",score:95}];
  assert.equal(selectCandidate(candidates,"https://evil.test/x"),null);
});
