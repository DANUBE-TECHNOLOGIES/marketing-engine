"use strict";

const {
 OFFER_ASSET_TYPES,
}=require("./public-offer-card");

class CampaignRepository {
 constructor(prisma, tenantId){ this.prisma=prisma; this.tenantId=tenantId; }
 include(){ return { agencies:{include:{agency:true}}, destinations:{include:{destination:true}}, tasks:{orderBy:{createdAt:"asc"}}, assets:{orderBy:{createdAt:"desc"}}, publications:true }; }
 list(){ return this.prisma.marketingCampaign.findMany({where:{tenantId:this.tenantId},include:{agencies:{include:{agency:true}},destinations:{include:{destination:true}},tasks:true,assets:true},orderBy:{createdAt:"desc"}}); }
 get(id){ return this.prisma.marketingCampaign.findFirst({where:{id,tenantId:this.tenantId},include:this.include()}); }
 listAgencies(){ return this.prisma.agency.findMany({where:{tenantId:this.tenantId},select:{id:true,name:true,city:true},orderBy:[{city:"asc"},{name:"asc"}]}); }
 countAgencies(ids){ return this.prisma.agency.count({where:{tenantId:this.tenantId,id:{in:ids}}}); }
 countDestinations(ids){ return this.prisma.destination.count({where:{tenantId:this.tenantId,id:{in:ids}}}); }
 create(data, agencyIds, destinationIds){ return this.prisma.marketingCampaign.create({data:{...data,tenantId:this.tenantId,source:{type:"campaign-manager",version:"15.1.0"},agencies:{create:agencyIds.map(agencyId=>({agencyId}))},destinations:{create:destinationIds.map(destinationId=>({destinationId}))}},include:this.include()}); }
 async update(id,data,agencyIds,destinationIds){ const current=await this.get(id); if(!current)return null; return this.prisma.$transaction(async tx=>{ if(agencyIds){ await tx.campaignAgency.deleteMany({where:{campaignId:id}}); if(agencyIds.length) await tx.campaignAgency.createMany({data:agencyIds.map(agencyId=>({campaignId:id,agencyId}))}); } if(destinationIds){ await tx.campaignDestination.deleteMany({where:{campaignId:id}}); if(destinationIds.length) await tx.campaignDestination.createMany({data:destinationIds.map(destinationId=>({campaignId:id,destinationId}))}); } await tx.marketingCampaign.update({where:{id},data}); return tx.marketingCampaign.findUnique({where:{id},include:this.include()}); }); }
 async remove(id){ const current=await this.get(id); if(!current)return null; return this.prisma.marketingCampaign.delete({where:{id}}); }
 createTasks(campaignId,tasks){ return this.prisma.$transaction(tasks.map(task=>this.prisma.campaignTask.upsert({where:{campaignId_key:{campaignId,key:task.key}},update:{type:task.type,channel:task.channel,payload:task.payload},create:{campaignId,...task}}))); }
 getAsset(campaignId, assetId){
  return this.prisma.campaignAsset.findFirst({
   where:{
    id:assetId,
    campaignId,
    campaign:{
     tenantId:this.tenantId
    }
   }
  });
 }

 updateAsset(assetId,data){
  return this.prisma.campaignAsset.update({
   where:{id:assetId},
   data
  });
 }

 async updateAssetReview(asset,data,decision){
  const linkedContentId=
   String(asset?.type||"").toLowerCase()==="seo-content"
    ? String(asset?.payload?.seoContentId||"").trim()
    : "";

  return this.prisma.$transaction(async tx=>{
   const updated=await tx.campaignAsset.update({
    where:{id:asset.id},
    data
   });

   if(linkedContentId){
    const contentData=
     decision.status==="approved"
      ? {status:"published",publishedAt:new Date()}
      : decision.status==="rejected"
       ? {status:"rejected"}
       : {status:"review"};

    const synced=await tx.seoContent.updateMany({
     where:{
      id:linkedContentId,
      tenantId:this.tenantId
     },
     data:contentData
    });

    if(synced.count!==1){
     const error=new Error("Le contenu éditorial lié à la campagne est introuvable dans ce tenant.");
     error.statusCode=409;
     error.code="CAMPAIGN_SEO_CONTENT_LINK_INVALID";
     throw error;
    }
   }

   return updated;
  });
 }

 listAssets(campaignId,{status,channel,type}={}){
  return this.prisma.campaignAsset.findMany({
   where:{
    campaignId,
    campaign:{
     tenantId:this.tenantId
    },
    ...(status?{status}:{}),
    ...(channel?{channel}:{}),
    ...(type?{type}:{})
   },
   orderBy:{createdAt:"desc"}
  });
 }

 listApprovedSiteOffers(agencyId,limit=24){
  return this.prisma.campaignAsset.findMany({
   where:{
    status:"approved",
    type:{in:[...OFFER_ASSET_TYPES]},
    campaign:{
     tenantId:this.tenantId,
     agencies:{some:{agencyId}}
    }
   },
   orderBy:[
    {updatedAt:"desc"},
    {createdAt:"desc"}
   ],
   take:Math.min(Math.max(Number(limit)||24,1),24)
  });
 }

 createAsset(data){
  return this.prisma.campaignAsset.create({data});
 }

}
module.exports=CampaignRepository;
