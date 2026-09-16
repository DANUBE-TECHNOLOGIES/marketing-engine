"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {normalizeEvent,experimentSummary,EXPERIMENT_MIN_VIEWS}=require("../src/modules/acquisition-telemetry");

test("MSE-25.216 accepts controlled experiment identity without PII",()=>{const e=normalizeEvent({event:"VIEW",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"session-216",experimentId:"hero-cta-human-v1",variant:"control"});assert.equal(e.experimentId,"hero-cta-human-v1");assert.equal(e.variant,"control");assert.equal(e.siteSlug,"ambassade-fram-mondescale-gien")});

test("MSE-25.216 rejects incomplete or malformed experiment identity",()=>{assert.equal(normalizeEvent({event:"VIEW",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"s",experimentId:"hero-cta-human-v1"}).error,"INCOMPLETE_EXPERIMENT_IDENTITY");assert.equal(normalizeEvent({event:"VIEW",siteSlug:"gien",campaign:"soleil-hiver",funnelId:"gien-soleil-hiver",sessionId:"s",experimentId:"bad value!",variant:"control"}).error,"INVALID_EXPERIMENT_IDENTITY")});

test("MSE-25.216 never declares a comparison eligible before both variants reach threshold",()=>{const base={experimentId:"hero-cta-human-v1",starts:10,q1:9,q2:8,q3:7,q4:6,q5:5,q6:4,formReached:4,leadSubmits:2};let [x]=experimentSummary([{...base,variant:"control",views:EXPERIMENT_MIN_VIEWS},{...base,variant:"human-advice-cta",views:EXPERIMENT_MIN_VIEWS-1}]);assert.equal(x.eligible,false);[x]=experimentSummary([{...base,variant:"control",views:EXPERIMENT_MIN_VIEWS},{...base,variant:"human-advice-cta",views:EXPERIMENT_MIN_VIEWS}]);assert.equal(x.eligible,true);assert.equal(Object.hasOwn(x,"winner"),false)});
