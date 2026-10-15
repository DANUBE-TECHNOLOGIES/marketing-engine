"use strict";
const assert=require("node:assert/strict");
const {PrismaClient}=require("@prisma/client");
const {createAdminService}=require("../src/modules/ambassade-fram/admin-service");
async function main(){
 const prisma=new PrismaClient();
 const offer=await prisma.framOffer.create({data:{
  type:"VENTE_FLASH",status:"DRAFT",title:"CI audit rollback",
  terms:"Conditions CI",startAt:new Date("2099-11-01T00:00:00Z"),endAt:new Date("2099-12-01T00:00:00Z")
 }});
 const tenantId="fram-ci-audit";
 try{
  await prisma.$transaction(async tx=>{
   await createAdminService(tx).publishOffer(offer.id);
   await tx.framAdminAudit.create({data:{action:"publish_offer",target:offer.id,tenantId,actorType:"ci"}});
  });
  assert.equal((await prisma.framOffer.findUnique({where:{id:offer.id}})).status,"PUBLISHED");
  assert.equal(await prisma.framAdminAudit.count({where:{target:offer.id,tenantId}}),1);
  await prisma.framOffer.update({where:{id:offer.id},data:{status:"DRAFT"}});
  let rejected=false;
  try{
   await prisma.$transaction(async tx=>{
    await createAdminService(tx).publishOffer(offer.id);
    await tx.framAdminAudit.create({data:{action:"publish_offer",target:offer.id,tenantId,actorType:null}});
   });
  }catch(error){rejected=true;}
  assert.equal(rejected,true,"Invalid audit insert must reject transaction");
  assert.equal((await prisma.framOffer.findUnique({where:{id:offer.id}})).status,"DRAFT","Offer must roll back if audit fails");
  assert.equal(await prisma.framAdminAudit.count({where:{target:offer.id,tenantId}}),1,"Failed audit must not persist");
  console.log("FRAM PostgreSQL atomic publication and audit rollback: PASS");
 }finally{
  await prisma.framAdminAudit.deleteMany({where:{target:offer.id,tenantId}});
  await prisma.framOffer.delete({where:{id:offer.id}});
  await prisma.$disconnect();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
