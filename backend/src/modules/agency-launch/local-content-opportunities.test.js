"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const{classifyOpportunity,localContentOpportunities}=require("./local-content-opportunities");
test("reinforces a strongly matching existing page",()=>{const r=classifyOpportunity({position:12,targetPage:{coverage:.8,titleCoverage:.6,slug:"sur-mesure"}});assert.equal(r.mode,"reinforce_existing");assert.equal(r.priority,"high")});
test("enriches a partially matching page instead of creating a new one",()=>{const r=classifyOpportunity({position:18,targetPage:{coverage:.55,titleCoverage:.2,slug:"circuits"}});assert.equal(r.mode,"enrich_existing")});
test("considers a new page only for a visible unmapped opportunity",()=>{const r=classifyOpportunity({position:14,targetPage:null});assert.equal(r.mode,"consider_new_page");assert.equal(r.priority,"high")});
test("does not create pages from weak signals",()=>{const r=classifyOpportunity({position:37,targetPage:null});assert.equal(r.mode,"monitor")});
test("summary exposes decision counts",()=>{const report={checks:[{code:"LOCAL_RANKINGS",opportunities:[{keywordId:1,keyword:"voyage sur mesure gien",position:13,targetPage:{coverage:.8}},{keywordId:2,keyword:"croisiere gien",position:17,targetPage:null}]}]};const out=localContentOpportunities(report);assert.equal(out.reinforce,1);assert.equal(out.considerNewPage,1);assert.equal(out.total,2)});
