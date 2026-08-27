"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {auditAcknowledgementChain}=require("./rollout-acknowledgement-chain-audit");
function ack(id,parent=null){return{snapshotId:id,chainVersion:1,previousAcknowledgementSnapshotId:parent};}
test("linear versioned acknowledgement chain resolves to one root",()=>{const audit=auditAcknowledgementChain([ack("a3","a2"),ack("a2","a1"),ack("a1")]);assert.equal(audit.ready,true);assert.equal(audit.rootSnapshotId,"a1");assert.equal(audit.depth,3);assert.equal(audit.missingParents.length,0);assert.equal(audit.cycles.length,0);assert.equal(audit.forks.length,0);});
test("missing parent makes acknowledgement chain invalid",()=>{const audit=auditAcknowledgementChain([ack("a2","ghost"),ack("a1")]);assert.equal(audit.ready,false);assert.equal(audit.missingParents.length,1);assert.equal(audit.missingParents[0].missingParentSnapshotId,"ghost");});
test("cycle makes acknowledgement chain invalid",()=>{const audit=auditAcknowledgementChain([ack("a2","a1"),ack("a1","a2")]);assert.equal(audit.ready,false);assert.ok(audit.cycles.length>=1);assert.equal(audit.rootSnapshotId,null);});
test("fork makes acknowledgement chain invalid",()=>{const audit=auditAcknowledgementChain([ack("a3","a1"),ack("a2","a1"),ack("a1")]);assert.equal(audit.ready,false);assert.equal(audit.forks.length,1);assert.equal(audit.forks[0].previousSnapshotId,"a1");});
test("disconnected multiple roots make acknowledgement chain invalid",()=>{const audit=auditAcknowledgementChain([ack("b1"),ack("a2","a1"),ack("a1")]);assert.equal(audit.ready,false);assert.equal(audit.roots.length,2);});
