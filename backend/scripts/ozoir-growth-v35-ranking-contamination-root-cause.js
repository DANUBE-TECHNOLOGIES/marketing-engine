#!/usr/bin/env node
"use strict";

/**
 * OZOIR GROWTH V3.5 — POST-V2.5 RANKING CONTAMINATION ROOT CAUSE
 * Strictly read-only. No provider call, no Prisma mutation, no campaign creation.
 */

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { matchRankingTarget, resolveAgencyPlaceId, extractPlaceId } = require("../src/lib/ranking-target-identity");

const prisma = new PrismaClient();
const OZOIR_ID = 5;
const SAFE_START = process.env.OZOIR_V35_SAFE_START || "2026-09-30T00:00:00.000Z";

function section(s){ console.log(`\n===== ${s} =====`); }
function j(v){ console.log(JSON.stringify(v,null,2)); }
function redactUrl(v){
  if (!v) return null;
  try { const u=new URL(String(v)); return `${u.origin}${u.pathname}${u.searchParams.has("placeid")?`?placeid=${u.searchParams.get("placeid")}`:""}`; }
  catch { return String(v); }
}
function sourceContract(){
  const serverPath=path.join(__dirname,"../src/server.js");
  const identityPath=path.join(__dirname,"../src/lib/ranking-target-identity.js");
  const server=fs.readFileSync(serverPath,"utf8");
  const identity=fs.readFileSync(identityPath,"utf8");
  const writers=[...server.matchAll(/prisma\.realRankingCheck\.create\s*\(/g)].map(m=>server.slice(0,m.index).split("\n").length);
  const matcherUses=[...server.matchAll(/isSameRankingTarget\s*\(/g)].map(m=>server.slice(0,m.index).split("\n").length);
  return {
    serverPath,
    identityPath,
    realRankingWriters:writers,
    matcherUses,
    writerCount:writers.length,
    matcherUseCount:matcherUses.length,
    hasStrictPlaceIdBranch:/targetPlaceId\s*&&\s*resultPlaceId/.test(identity),
    hasNameCityFallback:/name_city_fallback/.test(identity),
    serverShaHint:process.env.OZOIR_V35_SOURCE_SHA || null,
  };
}

async function main(){
  console.log("======================================================");
  console.log(" OZOIR GROWTH V3.5 — RANKING CONTAMINATION ROOT CAUSE");
  console.log(" READ ONLY / ZERO WRITE / ZERO PROVIDER CALL");
  console.log("======================================================");

  section("1. SOURCE CONTRACT");
  j(sourceContract());

  section("2. TARGET IDENTITIES");
  const agencies=await prisma.agency.findMany({where:{id:{in:[OZOIR_ID]}},select:{id:true,name:true,city:true,address:true,googleReviewUrl:true,googleLocationId:true,website:true}});
  const ozoir=agencies[0];
  if(!ozoir) throw new Error("OZOIR_AGENCY_NOT_FOUND");
  const nevers=await prisma.agency.findFirst({where:{city:{contains:"Nevers",mode:"insensitive"}},select:{id:true,name:true,city:true,address:true,googleReviewUrl:true,googleLocationId:true,website:true}});
  j({
    ozoir:{...ozoir,googleReviewUrl:redactUrl(ozoir.googleReviewUrl),targetPlaceId:resolveAgencyPlaceId(ozoir)},
    nevers:nevers?{...nevers,googleReviewUrl:redactUrl(nevers.googleReviewUrl),targetPlaceId:resolveAgencyPlaceId(nevers)}:null
  });

  section("3. POST-V2.5 CONTAMINATED ROWS");
  const rows=await prisma.realRankingCheck.findMany({where:{agencyId:OZOIR_ID,checkedAt:{gte:new Date(SAFE_START)}},orderBy:{checkedAt:"asc"},take:500});
  const analyzed=rows.map(r=>{
    const synthetic={title:r.title,url:r.url,city:r.city};
    const verdict=matchRankingTarget({agency:ozoir,result:synthetic});
    return {...r,resultPlaceId:extractPlaceId(r.url),strictReplay:verdict};
  });
  j(analyzed);

  section("4. STRICT REPLAY SUMMARY");
  const accepted=analyzed.filter(r=>r.strictReplay.matched);
  const rejected=analyzed.filter(r=>!r.strictReplay.matched);
  console.log(`POST_V25_ROWS=${analyzed.length}`);
  console.log(`STRICT_REPLAY_ACCEPTED=${accepted.length}`);
  console.log(`STRICT_REPLAY_REJECTED=${rejected.length}`);
  console.log(`STORED_FOUND_BUT_STRICT_REJECTED=${rejected.filter(r=>r.found).length}`);

  section("5. TIMELINE AROUND CONTAMINATION");
  if(rows.length){
    const first=rows[0].checkedAt;
    const from=new Date(first.getTime()-10*60*1000);
    const to=new Date(rows[rows.length-1].checkedAt.getTime()+10*60*1000);
    const nearby=await prisma.realRankingCheck.findMany({where:{checkedAt:{gte:from,lte:to}},orderBy:{checkedAt:"asc"},take:1000});
    j(nearby.map(r=>({id:r.id,agencyId:r.agencyId,keyword:r.keyword,city:r.city,found:r.found,title:r.title,url:r.url,checkedAt:r.checkedAt})));
  } else j([]);

  section("6. RUNTIME SOURCE EVIDENCE");
  const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
  const cronIndex=server.indexOf('cron.schedule("0 3 * * *"');
  const cronSlice=cronIndex>=0?server.slice(cronIndex,cronIndex+5000):"";
  console.log(`CRON_3AM_PRESENT=${cronIndex>=0?"YES":"NO"}`);
  console.log(`CRON_USES_STRICT_MATCHER=${/isSameRankingTarget\s*\(/.test(cronSlice)?"YES":"NO"}`);
  console.log(`CRON_WRITES_REAL_RANKING=${/realRankingCheck\.create\s*\(/.test(cronSlice)?"YES":"NO"}`);

  section("7. ROOT CAUSE DECISION");
  const storedBad=rejected.filter(r=>r.found);
  const strictCodePresent=/isSameRankingTarget\s*\(/.test(cronSlice);
  let diagnosis="NO_POST_V25_CONTAMINATION_TO_DIAGNOSE";
  if(storedBad.length && strictCodePresent) diagnosis="RUNTIME_OR_PROVIDER_SHAPE_MISMATCH_REQUIRES_RAW_RESULT_TRACE";
  if(storedBad.length && !strictCodePresent) diagnosis="RUNTIME_SOURCE_MISSING_V25_STRICT_MATCHER";
  console.log(`DIAGNOSIS=${diagnosis}`);
  console.log(`NEXT_PROVIDER_CALL_REQUIRED=${storedBad.length?"YES_ONE_CONTROLLED_TRACE_AFTER_INSTRUMENTATION":"NO"}`);
  console.log("HISTORICAL_ROWS_CHANGED=0");
  console.log("DATABASE_WRITES=0");
  console.log("PROVIDER_CALLS=0");
  console.log("PRODUCTION_CHANGED=NO");

  console.log("\n======================================================");
  console.log(" OZOIR GROWTH V3.5 — COMPLETE");
  console.log("======================================================");
}

main().catch(e=>{console.error("V35_ERROR=",e?.stack||e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
