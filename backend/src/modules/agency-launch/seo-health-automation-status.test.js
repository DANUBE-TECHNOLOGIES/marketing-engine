"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {agencySnapshotStatus,summarizeSnapshotAutomation}=require("./seo-health-automation-status");

test("snapshot younger than 36 hours is healthy",()=>{const now=new Date("2026-08-11T12:00:00Z");const status=agencySnapshotStatus([{capturedAt:"2026-08-10T06:00:00Z"}],now);assert.equal(status.status,"healthy");assert.equal(status.fresh,true)});
test("old or missing snapshot is flagged",()=>{const now=new Date("2026-08-11T12:00:00Z");assert.equal(agencySnapshotStatus([{capturedAt:"2026-08-09T00:00:00Z"}],now).status,"stale");assert.equal(agencySnapshotStatus([],now).status,"missing")});
test("network summary enters attention when one agency is stale",()=>{const summary=summarizeSnapshotAutomation([{agency:{id:1},snapshotStatus:{status:"healthy",latestCapturedAt:"2026-08-11T04:00:00Z"}},{agency:{id:2},snapshotStatus:{status:"stale",latestCapturedAt:"2026-08-08T04:00:00Z"}}]);assert.equal(summary.status,"attention");assert.equal(summary.stale,1);assert.equal(summary.issues.length,1)});