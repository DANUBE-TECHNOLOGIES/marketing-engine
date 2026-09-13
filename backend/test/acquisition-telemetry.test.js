"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {normalizeEvent,normalizeSiteSlug,intelligence}=require("../src/modules/acquisition-telemetry");

test("accepts anonymous funnel milestones",()=>{const e=normalizeEvent({event:"VIEW",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"session-1"});assert.equal(e.event,"VIEW");assert.equal(e.questionNumber,0);assert.equal(e.siteSlug,"ambassade-fram-mondescale-gien")});
test("accepts numbered question events",()=>{const e=normalizeEvent({event:"QUESTION_ANSWER",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"session-1",questionNumber:6,question:"maturity"});assert.equal(e.questionNumber,6);assert.equal(e.question,"maturity")});
test("normalizes public agency slugs",()=>{assert.equal(normalizeSiteSlug("bois-colombes"),"ambassade-fram-mondescale-bois-colombes");assert.equal(normalizeSiteSlug("lamorlaye"),"mondescale-lamorlaye")});
test("rejects malformed identity and question numbers",()=>{assert.equal(normalizeEvent({event:"VIEW"}).error,"MISSING_IDENTITY");assert.equal(normalizeEvent({event:"QUESTION_ANSWER",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"s",questionNumber:7}).error,"INVALID_QUESTION_NUMBER")});
test("computes conversion rates and the largest adjacent dropoff",()=>{const r=intelligence({siteSlug:"x",views:100,starts:80,q1:76,q2:70,q3:65,q4:60,q5:55,q6:50,formReached:48,leadSubmits:24});assert.equal(r.visitToStart,80);assert.equal(r.startToForm,60);assert.equal(r.formToLead,50);assert.equal(r.visitToLead,24);assert.deepEqual(r.worstDropoff,{from:"formReached",to:"leadSubmits",fromSessions:48,toSessions:24,lostSessions:24,lossRate:50})});
test("does not invent a dropoff without an upstream denominator",()=>{const r=intelligence({views:0,starts:0,q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,formReached:0,leadSubmits:0});assert.equal(r.visitToLead,null);assert.equal(r.worstDropoff,null)});
