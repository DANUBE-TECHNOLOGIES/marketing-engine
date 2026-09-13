"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {normalizeEvent}=require("../src/modules/acquisition-telemetry");

test("accepts anonymous funnel milestones",()=>{const e=normalizeEvent({event:"VIEW",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"session-1"});assert.equal(e.event,"VIEW");assert.equal(e.questionNumber,0)});
test("accepts numbered question events",()=>{const e=normalizeEvent({event:"QUESTION_ANSWER",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"session-1",questionNumber:6,question:"maturity"});assert.equal(e.questionNumber,6);assert.equal(e.question,"maturity")});
test("rejects malformed identity and question numbers",()=>{assert.equal(normalizeEvent({event:"VIEW"}).error,"MISSING_IDENTITY");assert.equal(normalizeEvent({event:"QUESTION_ANSWER",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"s",questionNumber:7}).error,"INVALID_QUESTION_NUMBER")});
