"use strict";
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PILOT_SITE_SLUG = "ambassade-fram-mondescale-bois-colombes";

async function main(){
  const checks=[];
  function push(name,ok,detail){checks.push({name,ok:Boolean(ok),detail});}
  const site=await prisma.agencySite.findFirst({where:{slug:PILOT_SITE_SLUG},select:{id:true,agencyId:true,slug:true}});
  push("agency-site",site?.slug===PILOT_SITE_SLUG,site?`${site.slug} / ${site.agencyId}`:"missing");
  const cols=await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='PublicLead'`);
  const names=new Set(cols.map(x=>x.column_name));
  const required=["funnelId","funnelVersion","qualificationScore","leadTemperature","recommendedAction","funnelAnswers","consentEvidence"];
  const missing=required.filter(x=>!names.has(x));
  push("lead-schema",missing.length===0,missing.length?`missing: ${missing.join(", ")}`:"acquisition metadata present");
  const leadTable=names.has("id")&&names.has("email")&&names.has("notificationStatus");
  push("lead-intake-base",leadTable,"id/email/notificationStatus");
  const agency=site?await prisma.agency.findUnique({where:{id:site.agencyId},select:{name:true,city:true,email:true}}):null;
  push("agency-notification",Boolean(agency?.email),agency?.email?`${agency.name||agency.city} / email configured`:"agency email missing");
  console.table(checks);
  if(checks.some(c=>!c.ok)){console.error("MSE-25.206 acquisition readiness: NOT READY");process.exitCode=1;return;}
  console.log("MSE-25.206 acquisition readiness: READY");
}
main().catch(e=>{console.error("MSE-25.206 readiness failed",e);process.exitCode=1}).finally(()=>prisma.$disconnect());
