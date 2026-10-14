"use strict";
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
async function main() {
 const prisma = new PrismaClient();
 const ids = [];
 try {
  for (let i=0;i<5;i++) {
   const offer = await prisma.framOffer.create({data:{
    type:"EXCLUS_AMBASSADE",status:"DRAFT",campaignMonth:"2099-11",
    title:"CI monthly offer "+i,terms:"Conditions de test",
    startAt:new Date("2099-11-01T00:00:00Z"),
    endAt:new Date("2099-12-01T00:00:00Z")
   }});
   ids.push(offer.id);
  }
  for (const id of ids.slice(0,4)) await prisma.framOffer.update({where:{id},data:{status:"PUBLISHED"}});
  let rejected=false;
  try { await prisma.framOffer.update({where:{id:ids[4]},data:{status:"PUBLISHED"}}); }
  catch (error) { rejected=true; }
  assert.equal(rejected,true,"Database must reject fifth published monthly exclusive");
  const count=await prisma.framOffer.count({where:{campaignMonth:"2099-11",type:"EXCLUS_AMBASSADE",status:"PUBLISHED"}});
  assert.equal(count,4);
  await prisma.framOffer.updateMany({where:{id:{in:ids}},data:{status:"DRAFT"}});
  const simultaneous = await Promise.allSettled(ids.map(id=>prisma.framOffer.update({where:{id},data:{status:"PUBLISHED"}})));
  assert.equal(simultaneous.filter(result=>result.status==="fulfilled").length,4,"Exactly four concurrent publications should succeed");
  assert.equal(simultaneous.filter(result=>result.status==="rejected").length,1,"Fifth concurrent publication must be rejected");
  console.log("FRAM PostgreSQL monthly limit and concurrent publications: PASS");
 } finally {
  await prisma.framOffer.deleteMany({where:{id:{in:ids}}});
  await prisma.$disconnect();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
