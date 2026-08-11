"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{encodeSnapshot,decodeSnapshot,seoHealthTrend}=require("./seo-health-history");
test("snapshot preserves score grade and component ratios",()=>{const comment=encodeSnapshot({seoHealth:{score:58,grade:"C",status:"watch",components:[{code:"visibility",points:12,weight:30,ratio:.4}]}},new Date("2026-08-11T10:00:00Z"));const row=decodeSnapshot({id:1,comment});assert.equal(row.score,58);assert.equal(row.grade,"C");assert.equal(row.components[0].code,"visibility")});
test("trend compares current health with available 30 60 90 day baselines",()=>{const now=new Date("2026-08-11T12:00:00Z");const history=[{capturedAt:"2026-07-10T12:00:00Z",score:52},{capturedAt:"2026-06-01T12:00:00Z",score:48}];const trend=seoHealthTrend({score:58},history,now);assert.equal(trend.windows[0].scoreDelta,6);assert.equal(trend.windows[1].scoreDelta,10)});
test("missing baseline remains non comparable",()=>{const trend=seoHealthTrend({score:70},[],new Date("2026-08-11T12:00:00Z"));assert.equal(trend.windows[0].comparable,false);assert.equal(trend.windows[0].scoreDelta,null)});