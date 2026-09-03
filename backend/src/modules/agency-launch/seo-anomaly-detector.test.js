"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const{rankingAnomalies,healthAnomalies,agencySeoAnomalies}=require("./seo-anomaly-detector");

test("detects loss of top 10",()=>{const result=rankingAnomalies({checks:[{code:"LOCAL_RANKINGS",items:[{keywordId:1,keyword:"agence voyage gien",city:"Gien",momentum:{previousPosition:8,latestPosition:14}}]}]});assert.equal(result.length,1);assert.equal(result[0].type,"top10_lost");assert.equal(result[0].severity,"warning")});
test("detects a critical ranking collapse",()=>{const result=rankingAnomalies({checks:[{code:"LOCAL_RANKINGS",items:[{keywordId:2,keyword:"voyage sur mesure",momentum:{previousPosition:15,latestPosition:38}}]}]});assert.equal(result[0].type,"ranking_drop");assert.equal(result[0].severity,"critical")});
test("does not alert without comparable health history",()=>{assert.equal(healthAnomalies({seoHealthTrend:{currentScore:55,windows:[{days:30,comparable:false,scoreDelta:null}]}}).length,0)});
test("detects significant health score decline",()=>{const result=healthAnomalies({seoHealthTrend:{currentScore:54,windows:[{days:30,comparable:true,scoreDelta:-16,baseline:{score:70}}]}});assert.equal(result.length,1);assert.equal(result[0].severity,"warning")});
test("aggregates severity counts",()=>{const summary=agencySeoAnomalies({checks:[{code:"LOCAL_RANKINGS",items:[{keywordId:1,keyword:"test",momentum:{previousPosition:5,latestPosition:31}}]}],seoHealthTrend:{windows:[]}});assert.equal(summary.critical,1);assert.equal(summary.total,1)});
