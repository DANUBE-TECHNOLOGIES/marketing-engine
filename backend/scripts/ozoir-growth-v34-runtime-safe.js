#!/usr/bin/env node
"use strict";

/** OZOIR GROWTH V3.4.1 — runtime-safe read-only diagnostic. */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const AGENCY_ID = 5;
const SITE_SLUG = "ambassade-fram-mondescale-ozoir-la-ferriere";
const SITE_URL = "sc-domain:mondescale.com";
const SAFE_START = process.env.OZOIR_V34_SAFE_RANKING_START || "2026-09-30T00:00:00.000Z";
const GSC_ORIGIN = (process.env.OZOIR_V34_GSC_ORIGIN || "").replace(/\/$/, "");

const out = v => console.log(JSON.stringify(v, (_,x)=>typeof x === "bigint" ? Number(x) : x, 2));
const section = s => console.log(`\n===== ${s} =====`);
const qi = s => `"${String(s).replaceAll('"','""')}"`;

async function columns(table) {
  const r = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, table);
  return new Set(r.map(x=>x.column_name));
}
async function rows(table, wanted, where="TRUE", order="", limit="") {
  const c = await columns(table);
  if (!c.size) return { rows:[], columns:[] };
  const pick = wanted.filter(x=>c.has(x));
  if (!pick.length) return { rows:[], columns:[...c] };
  return { rows: await prisma.$queryRawUnsafe(`SELECT ${pick.map(qi).join(",")} FROM ${qi(table)} WHERE ${where} ${order} ${limit}`), columns:[...c] };
}
function identity(row) {
  if (!row.found) return {valid:true, reason:"NOT_FOUND"};
  const s=`${row.title||""} ${row.url||""}`.toLowerCase();
  if (s.includes("ozoir") || s.includes("chijlz6-xcwh5kcrgckepfa_yjw")) return {valid:true,reason:"OZOIR_IDENTITY"};
  if (/nevers|maurepas|\bdax\b|\bgien\b|bois-colombes|lamorlaye/.test(s)) return {valid:false,reason:"CROSS_AGENCY"};
  return {valid:false,reason:"IDENTITY_NOT_PROVEN"};
}
async function optionalGsc(dimensions, days) {
  if (!GSC_ORIGIN) return {available:false, reason:"OZOIR_V34_GSC_ORIGIN_NOT_SET"};
  try {
    const u=new URL("/search-console-submissions/performance",GSC_ORIGIN);
    Object.entries({siteUrl:SITE_URL,siteSlug:SITE_SLUG,days,dimensions,rowLimit:25000}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
    const r=await fetch(u,{headers:{accept:"application/json"},signal:AbortSignal.timeout(10000)});
    const text=await r.text(); let body; try{body=JSON.parse(text)}catch{body={raw:text.slice(0,1000)}}
    return {available:r.ok,http:r.status,body};
  } catch(e) { return {available:false,reason:e.cause?.code||e.code||e.message}; }
}
async function main(){
  console.log("======================================================\n OZOIR GROWTH V3.4.1 — RUNTIME SAFE\n READ ONLY / GSC NON-BLOCKING / NO PROVIDER CALL\n======================================================");
  section("1. IDENTITY");
  const agency=(await prisma.$queryRawUnsafe(`SELECT * FROM "Agency" WHERE id=${AGENCY_ID} LIMIT 1`))[0];
  const site=(await prisma.$queryRawUnsafe(`SELECT * FROM "AgencySite" WHERE "agencyId"=${AGENCY_ID} AND slug='${SITE_SLUG}' LIMIT 1`))[0];
  if(!agency||!site) throw new Error("OZOIR_IDENTITY_NOT_FOUND"); out({agency,site});

  section("2. GSC — OPTIONAL / NON BLOCKING");
  const gsc90=await optionalGsc("query,page",90); const gsc28=await optionalGsc("query,page",28); const gscPages=await optionalGsc("page",90);
  console.log(`GSC_90_AVAILABLE=${gsc90.available?"YES":"NO"}`); console.log(`GSC_28_AVAILABLE=${gsc28.available?"YES":"NO"}`); console.log(`GSC_PAGE_AVAILABLE=${gscPages.available?"YES":"NO"}`);
  if(!gsc90.available) console.log(`GSC_SKIP_REASON=${gsc90.reason||`HTTP_${gsc90.http}`}`);
  if(gsc90.available) out(gsc90.body);
  if(gsc28.available) out(gsc28.body);
  if(gscPages.available) out(gscPages.body);

  section("3. REAL RANKING POST-V2.5");
  console.log(`SAFE_RANKING_START=${SAFE_START}`);
  const post=await rows("RealRankingCheck",["id","agencyId","keyword","city","found","position","absolutePosition","title","url","rating","reviews","checkedAt"],`"agencyId"=${AGENCY_ID} AND "checkedAt">='${SAFE_START}'`,`ORDER BY "checkedAt" DESC`,`LIMIT 2000`);
  const valid=[], suspicious=[]; for(const r of post.rows){const v=identity(r);(v.valid?valid:suspicious).push({...r,identityReason:v.reason});}
  console.log(`POST_V25_ROWS=${post.rows.length}`); console.log(`POST_V25_VALID=${valid.length}`); console.log(`POST_V25_SUSPICIOUS=${suspicious.length}`); out({valid,suspicious});

  section("4. HISTORICAL CONTAMINATION");
  const hist=await rows("RealRankingCheck",["id","agencyId","keyword","city","found","position","absolutePosition","title","url","checkedAt"],`"agencyId"=${AGENCY_ID} AND "checkedAt"<'${SAFE_START}'`,`ORDER BY "checkedAt" DESC`,`LIMIT 10000`);
  const groups=new Map(); let contaminated=0, validHistorical=0;
  for(const r of hist.rows){const v=identity(r); if(v.valid) validHistorical++; else {contaminated++; const k=`${r.title||""} | ${r.url||""} | ${v.reason}`; groups.set(k,(groups.get(k)||0)+1);}}
  out({rows:hist.rows.length,validHistorical,contaminated,groups:[...groups].sort((a,b)=>b[1]-a[1]).map(([identity,count])=>({identity,count}))});

  section("5. GRID CAMPAIGNS");
  const camps=await rows("RankingGridCampaign",["id","agencyId","keywordId","keyword","city","centerLat","centerLng","gridSize","spacingKm","provider","status","summary","startedAt","completedAt","createdAt","updatedAt"],`"agencyId"=${AGENCY_ID}`,`ORDER BY "createdAt" DESC`);
  const reports=[];
  for(const c of camps.rows){
    const pts=await rows("RankingGridPoint",["id","campaignId","row","col","latitude","longitude","northKm","eastKm","status","found","position","absolutePosition","title","url","rating","reviews","cost","checkedAt"],`"campaignId"=${Number(c.id)}`,`ORDER BY "row","col"`);
    const found=pts.rows.filter(x=>x.found); const pos=found.map(x=>Number(x.position||x.absolutePosition||0)).filter(Boolean);
    reports.push({campaign:c,metrics:{points:pts.rows.length,found:found.length,top3:pos.filter(x=>x<=3).length,top10:pos.filter(x=>x<=10).length,top20:pos.filter(x=>x<=20).length,notFound:pts.rows.length-found.length,avg:pos.length?pos.reduce((a,b)=>a+b,0)/pos.length:null,best:pos.length?Math.min(...pos):null,worst:pos.length?Math.max(...pos):null}});
  }
  out(reports);

  section("6. LEADS / CONVERSION");
  const leadCols=await columns("Lead");
  if(leadCols.size){const wanted=["id","agencyId","siteSlug","source","utm_source","utm_medium","status","temperature","createdAt","convertedAt"].filter(x=>leadCols.has(x)); const conditions=[]; if(leadCols.has("agencyId"))conditions.push(`"agencyId"=${AGENCY_ID}`); if(leadCols.has("siteSlug"))conditions.push(`"siteSlug"='${SITE_SLUG}'`); const where=conditions.length?`(${conditions.join(" OR ")})`:"FALSE"; out(await rows("Lead",wanted,where,leadCols.has("createdAt")?`ORDER BY "createdAt" DESC`:"",`LIMIT 5000`));} else console.log("LEAD_TABLE=ABSENT");

  section("7. DECISION CONTRACT");
  const cleanRanking=valid.length>0 && suspicious.length===0;
  console.log(`OZOIR_IDENTITY_VERIFIED=YES`); console.log(`GSC_AVAILABLE=${gsc90.available?"YES":"NO"}`); console.log(`POST_V25_IDENTITY_CLEAN=${cleanRanking?"YES":"NO_OR_NO_DATA"}`); console.log(`GRID_CAMPAIGNS=${camps.rows.length}`);
  console.log(`V4_GSC_DECISION_READY=${gsc90.available?"YES":"NO"}`); console.log(`V4_RANKING_DECISION_READY=${valid.length?"YES":"NO"}`);
  console.log("DATABASE_WRITES=0\nSOURCE_RUNTIME_CHANGED=NO\nPRODUCTION_CHANGED=NO\nDATAFORSEO_CALLS=0\nRANKING_CAMPAIGN_CREATED=NO\nSEARCH_CONSOLE_WRITES=0\nGBP_WRITES=0");
  console.log("======================================================\n OZOIR GROWTH V3.4.1 — COMPLETE\n======================================================");
}
main().catch(e=>{console.error("V341_ERROR=",e?.stack||e);process.exitCode=1}).finally(()=>prisma.$disconnect());
