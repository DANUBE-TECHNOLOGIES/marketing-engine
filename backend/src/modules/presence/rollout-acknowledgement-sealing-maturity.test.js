"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {evaluateAcknowledgementSealingMaturity}=require("./rollout-acknowledgement-sealing-maturity");

test("legacy valid chain is non blocking but warns about incomplete sealing",()=>{const result=evaluateAcknowledgementSealingMaturity({ready:true,versioned:true,fullyExplicit:false,explicitCoveragePercent:0,legacyRootDeclarations:3,explicitRootDeclarations:0});assert.equal(result.status,"legacy_valid");assert.equal(result.blocking,false);assert.equal(result.warning,"acknowledgement_chain_not_fully_explicit");});
test("mixed chain reports progress without blocking",()=>{const result=evaluateAcknowledgementSealingMaturity({ready:true,versioned:true,fullyExplicit:false,explicitCoveragePercent:67,legacyRootDeclarations:1,explicitRootDeclarations:2,sealedFromSnapshotId:"ack-3"});assert.equal(result.status,"progressing");assert.equal(result.explicitCoveragePercent,67);assert.equal(result.sealedFromSnapshotId,"ack-3");assert.equal(result.blocking,false);});
test("fully explicit chain is mature and warning free",()=>{const result=evaluateAcknowledgementSealingMaturity({ready:true,versioned:true,fullyExplicit:true,explicitCoveragePercent:100,legacyRootDeclarations:0,explicitRootDeclarations:4});assert.equal(result.status,"fully_explicit");assert.equal(result.warning,null);assert.equal(result.blocking,false);});
test("invalid chain is blocking regardless of explicit coverage",()=>{const result=evaluateAcknowledgementSealingMaturity({ready:false,versioned:true,fullyExplicit:false,explicitCoveragePercent:50,legacyRootDeclarations:1,explicitRootDeclarations:1});assert.equal(result.status,"invalid");assert.equal(result.blocking,true);});
