"use strict";
class CampaignRepository {
 constructor(prisma, tenantId){ this.prisma=prisma; this.tenantId=tenantId; }
 include(){ return { agencies:{include:{agency:true}}, destinations:{include:{destination:true}}, tasks:{orderBy:{createdAt:"asc"}}, assets:{orderBy:{createdAt:"desc"}}, publications:true }; }
 list(){ return this.prisma.marketingCampaign.findMany({where:{tenantId:this.tenantId},include:{agencies:{include:{agency:true}},destinations:{include:{destination:true}},tasks:true,assets:true},orderBy:{createdAt:"desc"}}); }
 get(id){ return this.prisma.marketingCampaign.findFirst({where:{id,tenantId:this.tenantId},include:this.include()}); }
 countAgencies(ids){ return this.prisma.agency.count({where:{tenantId:this.tenantId,id:{in:ids}}}); }
 countDestinations(ids){ return this.prisma.destination.count({where:{tenantId:this.tenantId,id:{in:ids}}}); }
 create(data, agencyIds, destinationIds){ return this.prisma.marketingCampaign.create({data:{...data,tenantId:this.tenantId,source:{type:"campaign-manager",version:"15.1.0"},agencies:{create:agencyIds.map(agencyId=>({agencyId}))},destinations:{create:destinationIds.map(destinationId=>({destinationId}))}},include:this.include()}); }
 async update(id,data,agencyIds,destinationIds){ const current=await this.get(id); if(!current)return null; return this.prisma.$transaction(async tx=>{ if(agencyIds){ await tx.campaignAgency.deleteMany({where:{campaignId:id}}); if(agencyIds.length) await tx.campaignAgency.createMany({data:agencyIds.map(agencyId=>({campaignId:id,agencyId}))}); } if(destinationIds){ await tx.campaignDestination.deleteMany({where:{campaignId:id}}); if(destinationIds.length) await tx.campaignDestination.createMany({data:destinationIds.map(destinationId=>({campaignId:id,destinationId}))}); } await tx.marketingCampaign.update({where:{id},data}); return tx.marketingCampaign.findUnique({where:{id},include:this.include()}); }); }
 async remove(id){ const current=await this.get(id); if(!current)return null; return this.prisma.marketingCampaign.delete({where:{id}}); }
 createTasks(campaignId,tasks){ return this.prisma.$transaction(tasks.map(task=>this.prisma.campaignTask.upsert({where:{campaignId_key:{campaignId,key:task.key}},update:{type:task.type,channel:task.channel,payload:task.payload},create:{campaignId,...task}}))); }
}
module.exports=CampaignRepository;
