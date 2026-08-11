"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{classifyAutomationAlert}=require("./seo-health-automation-alerts");
test("missing snapshots are critical",()=>{const a=classifyAutomationAlert({healthy:7,stale:1,missing:1});assert.equal(a.level,"critical");assert.equal(a.action,"check_timer_and_run_snapshot")});
test("stale snapshots are warnings",()=>{const a=classifyAutomationAlert({healthy:8,stale:1,missing:0});assert.equal(a.level,"warning")});
test("fresh collection is healthy",()=>{const a=classifyAutomationAlert({healthy:9,stale:0,missing:0});assert.equal(a.level,"ok");assert.equal(a.action,null)});