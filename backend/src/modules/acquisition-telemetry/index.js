"use strict";

const express=require("express");
const {randomUUID}=require("node:crypto");
const {NETWORK_AGENCIES}=require("../acquisition-funnel");

const ALLOWED_EVENTS=new Set(["VIEW","START","QUESTION_ANSWER","FORM_REACHED","LEAD_SUBMIT"]);
const STAGES=["views","starts","q1","q2","q3","q4","q5","q6","formReached","leadSubmits"];
const EXPERIMENT_MIN_VIEWS=20;

function clean(v,max=240){return String(v??"").trim().replace(/\s+/g," ").slice(0,max)}
function clampDays(v){return Math.min(Math.max(Number(v||30),1),365)}
function normalizeSiteSlug(value){const raw=clean(value,160);const agency=NETWORK_AGENCIES.find((item)=>item.publicSiteSlug===raw||item.siteSlug===raw);return agency?.siteSlug||raw}
function normalizeVariant(value){const variant=clean(value,80);return /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(variant)?variant:null}
function normalizeExperimentId(value){const id=clean(value,120);return /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(id)?id:null}

function normalizeEvent(body={}){
  const event=clean(body.event,40).toUpperCase();
  if(!ALLOWED_EVENTS.has(event))return{error:"INVALID_EVENT"};
  const siteSlug=normalizeSiteSlug(body.siteSlug),campaign=clean(body.campaign,160),funnelId=clean(body.funnelId,180),sessionId=clean(body.sessionId,180);
  if(!siteSlug||!campaign||!funnelId||!sessionId)return{error:"MISSING_IDENTITY"};
  const questionNumber=body.questionNumber==null?0:Number(body.questionNumber);
  if(event==="QUESTION_ANSWER"&&(!Number.isInteger(questionNumber)||questionNumber<1||questionNumber>6))return{error:"INVALID_QUESTION_NUMBER"};
  if(event!=="QUESTION_ANSWER"&&questionNumber!==0)return{error:"UNEXPECTED_QUESTION_NUMBER"};
  const experimentId=body.experimentId==null?null:normalizeExperimentId(body.experimentId);
  const variant=body.variant==null?null:normalizeVariant(body.variant);
  if((body.experimentId!=null&&!experimentId)||(body.variant!=null&&!variant))return{error:"INVALID_EXPERIMENT_IDENTITY"};
  if(Boolean(experimentId)!==Boolean(variant))return{error:"INCOMPLETE_EXPERIMENT_IDENTITY"};
  return{event,siteSlug,campaign,funnelId,sessionId,questionNumber,question:clean(body.question,120)||null,experimentId,variant,utmSource:clean(body.utmSource,240)||null,utmMedium:clean(body.utmMedium,240)||null,utmCampaign:clean(body.utmCampaign,240)||null,utmContent:clean(body.utmContent,240)||null,referrer:clean(body.referrer,1000)||null,path:clean(body.path,1000)||null};
}

function stageSelect(){return `COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='VIEW')::int AS "views", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='START')::int AS "starts", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='FORM_REACHED')::int AS "formReached", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='LEAD_SUBMIT')::int AS "leadSubmits", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=1)::int AS "q1", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=2)::int AS "q2", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=3)::int AS "q3", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=4)::int AS "q4", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=5)::int AS "q5", COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='QUESTION_ANSWER' AND "questionNumber"=6)::int AS "q6"`}
function rate(a,b){return b?Number(((100*Number(a||0))/Number(b)).toFixed(1)):null}
function intelligence(row){const values=STAGES.map(k=>Number(row[k]||0));let worst=null;for(let i=1;i<STAGES.length;i++){const from=values[i-1],to=values[i];if(!from)continue;const loss=Math.max(from-to,0),lossRate=rate(loss,from);if(!worst||lossRate>worst.lossRate)worst={from:STAGES[i-1],to:STAGES[i],fromSessions:from,toSessions:to,lostSessions:loss,lossRate}}return{...row,visitToStart:rate(row.starts,row.views),startToForm:rate(row.formReached,row.starts),formToLead:rate(row.leadSubmits,row.formReached),visitToLead:rate(row.leadSubmits,row.views),worstDropoff:worst}}
function experimentSummary(rows){const variants=rows.map((row)=>({...intelligence(row),views:Number(row.views||0),eligible:Number(row.views||0)>=EXPERIMENT_MIN_VIEWS}));const byExperiment=new Map();for(const row of variants){if(!byExperiment.has(row.experimentId))byExperiment.set(row.experimentId,[]);byExperiment.get(row.experimentId).push(row)}return[...byExperiment].map(([experimentId,items])=>({experimentId,minViewsPerVariant:EXPERIMENT_MIN_VIEWS,eligible:items.length>=2&&items.every(x=>x.eligible),variants:items}));}

function routes({prisma}={}){
  const router=express.Router();
  router.post("/api/public/acquisition-telemetry",async(req,res)=>{if(!prisma)return res.status(503).json({ok:false,error:"PERSISTENCE_UNAVAILABLE"});const evt=normalizeEvent(req.body||{});if(evt.error)return res.status(400).json({ok:false,error:evt.error});try{await prisma.$executeRawUnsafe(`INSERT INTO "AcquisitionFunnelEvent" ("id","event","siteSlug","campaign","funnelId","sessionId","questionNumber","question","experimentId","variant","utmSource","utmMedium","utmCampaign","utmContent","referrer","path","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW()) ON CONFLICT ("sessionId","event","questionNumber") DO NOTHING`,`evt_${randomUUID().replaceAll("-","")}`,evt.event,evt.siteSlug,evt.campaign,evt.funnelId,evt.sessionId,evt.questionNumber,evt.question,evt.experimentId,evt.variant,evt.utmSource,evt.utmMedium,evt.utmCampaign,evt.utmContent,evt.referrer,evt.path);return res.status(202).json({ok:true})}catch(e){console.error("[acquisition-telemetry] event failed",e);return res.status(500).json({ok:false,error:"TELEMETRY_WRITE_FAILED"})}});
  router.get("/api/leads/acquisition/funnel-analytics",async(req,res)=>{if(!prisma)return res.status(503).json({ok:false,error:"PERSISTENCE_UNAVAILABLE"});try{const days=clampDays(req.query.days),siteSlug=req.query.siteSlug?normalizeSiteSlug(req.query.siteSlug):null;const rows=await prisma.$queryRawUnsafe(`SELECT "siteSlug", ${stageSelect()} FROM "AcquisitionFunnelEvent" WHERE "createdAt">=NOW()-($1*INTERVAL '1 day') AND ($2::text IS NULL OR "siteSlug"=$2) GROUP BY "siteSlug" ORDER BY COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='VIEW') DESC`,days,siteSlug);return res.json({ok:true,days,siteSlug,agencies:rows})}catch(e){console.error("[acquisition-telemetry] analytics failed",e);return res.status(500).json({ok:false,error:"TELEMETRY_ANALYTICS_FAILED"})}});
  router.get("/api/leads/acquisition/funnel-intelligence",async(req,res)=>{if(!prisma)return res.status(503).json({ok:false,error:"PERSISTENCE_UNAVAILABLE"});try{const days=clampDays(req.query.days),siteSlug=req.query.siteSlug?normalizeSiteSlug(req.query.siteSlug):null;const base=`FROM "AcquisitionFunnelEvent" WHERE "createdAt">=NOW()-($1*INTERVAL '1 day') AND ($2::text IS NULL OR "siteSlug"=$2)`;const agencies=await prisma.$queryRawUnsafe(`SELECT "siteSlug", ${stageSelect()} ${base} GROUP BY "siteSlug" ORDER BY COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='VIEW') DESC`,days,siteSlug);const channels=await prisma.$queryRawUnsafe(`SELECT COALESCE(NULLIF("utmSource",''),'direct') AS "source", ${stageSelect()} ${base} GROUP BY COALESCE(NULLIF("utmSource",''),'direct') ORDER BY COUNT(DISTINCT "sessionId") FILTER (WHERE "event"='VIEW') DESC`,days,siteSlug);const network=intelligence(agencies.reduce((a,r)=>{for(const k of STAGES)a[k]=(a[k]||0)+Number(r[k]||0);return a},{siteSlug:"network"}));return res.json({ok:true,days,siteSlug,network,agencies:agencies.map(intelligence),channels:channels.map(intelligence)})}catch(e){console.error("[acquisition-telemetry] intelligence failed",e);return res.status(500).json({ok:false,error:"TELEMETRY_INTELLIGENCE_FAILED"})}});
  router.get("/api/leads/acquisition/experiments",async(req,res)=>{if(!prisma)return res.status(503).json({ok:false,error:"PERSISTENCE_UNAVAILABLE"});try{const days=clampDays(req.query.days),siteSlug=req.query.siteSlug?normalizeSiteSlug(req.query.siteSlug):null;const rows=await prisma.$queryRawUnsafe(`SELECT "experimentId","variant",${stageSelect()} FROM "AcquisitionFunnelEvent" WHERE "createdAt">=NOW()-($1*INTERVAL '1 day') AND ($2::text IS NULL OR "siteSlug"=$2) AND "experimentId" IS NOT NULL AND "variant" IS NOT NULL GROUP BY "experimentId","variant" ORDER BY "experimentId","variant"`,days,siteSlug);return res.json({ok:true,days,siteSlug,decisionPolicy:"OBSERVE_ONLY_NO_AUTOMATIC_WINNER",experiments:experimentSummary(rows)})}catch(e){console.error("[acquisition-telemetry] experiments failed",e);return res.status(500).json({ok:false,error:"EXPERIMENT_ANALYTICS_FAILED"})}});
  return router;
}

module.exports={ALLOWED_EVENTS,STAGES,EXPERIMENT_MIN_VIEWS,normalizeEvent,normalizeSiteSlug,normalizeVariant,normalizeExperimentId,intelligence,experimentSummary,routes};
