"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const{fingerprint,applyLifecycle}=require("./seo-anomaly-lifecycle");
test("fingerprint stays stable for the same ranking anomaly",()=>{assert.equal(fingerprint({type:"top10_lost",keywordId:7}),"top10_lost:7:")});
test("new alerts default to new",()=>{const r=applyLifecycle({anomalies:[{type:"ranking_drop",keywordId:3}]},[]);assert.equal(r.alerts[0].lifecycle.status,"new");assert.equal(r.new,1)});
test("latest persisted state is applied",()=>{const r=applyLifecycle({anomalies:[{type:"health_drop",days:30}]},[{fingerprint:"health_drop::30",status:"investigating",updatedAt:"2026-08-11T10:00:00Z"}]);assert.equal(r.alerts[0].lifecycle.status,"investigating");assert.equal(r.investigating,1)});
