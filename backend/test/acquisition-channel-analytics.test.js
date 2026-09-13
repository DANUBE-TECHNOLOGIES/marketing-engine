"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const { analyticsQuery }=require("../src/modules/acquisition-funnel");
test("default analytics remains funnel scoped",()=>{const sql=analyticsQuery();assert.match(sql,/GROUP BY "funnelId","siteSlug"/);assert.doesNotMatch(sql,/COALESCE\("utmSource"/)});
test("channel analytics groups persisted UTM dimensions",()=>{const sql=analyticsQuery({byChannel:true});for(const field of ["utmSource","utmMedium","utmCampaign","utmContent"])assert.match(sql,new RegExp(field));assert.match(sql,/notificationSent/);assert.match(sql,/COALESCE\("utmSource",'direct'\)/)});
