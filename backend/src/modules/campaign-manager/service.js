"use strict";
const CampaignRepository=require("./repository");
const {CHANNELS,validateCampaignInput}=require("./validation");
const {
 validateAssetDecision,
 buildReviewMetadata
}=require("./asset-review");
const {
 validateOfferAssetInput,
 assertOfferAssetPublishable,
}=require("./offer-asset");
const {
 toPublicOfferCard,
}=require("./public-offer-card");
const DEFAULT_CHANNELS=["landing-page","faq","facebook","instagram","google-business","newsletter","hero-image"];
class CampaignService {
 constructor(prismaOrRepo,tenantId){ this.repo=prismaOrRepo?.list?prismaOrRepo:new CampaignRepository(prismaOrRepo,tenantId); }
 health(){ return {ok:true,version:"15.1.0",capability:"marketing-campaign-manager",channels:[...CHANNELS]}; }
 summarize(c){ const tasks=c.tasks||[]; const done=tasks.filter(x=>x.status==="completed").length; return {...c,metrics:{agencies:c.agencies?.length||0,destinations:c.destinations?.length||0,tasks:tasks.length,assets:c.assets?.length||0,completedTasks:done,progress:tasks.length?Math.round(done*100/tasks.length):c.progress||0}}; }
 async list(){ return (await this.repo.list()).map(c=>this.summarize(c)); }
 async listAgencyOptions(){ return this.repo.listAgencies(); }
 async listApprovedOfferOptions(agencyId,limit=24){
  const numericAgencyId=Number(agencyId);
  if(!Number.isInteger(numericAgencyId)||numericAgencyId<=0){
   throw Object.assign(new Error("Identifiant d’agence invalide."),{statusCode:400,code:"CAMPAIGN_OFFER_AGENCY_INVALID"});
  }
  if(await this.repo.countAgencies([numericAgencyId])!==1){
   throw Object.assign(new Error("Agence introuvable dans ce tenant."),{statusCode:404,code:"CAMPAIGN_OFFER_AGENCY_NOT_FOUND"});
  }
  return (await this.repo.listApprovedSiteOffers(numericAgencyId,limit))
   .map(toPublicOfferCard)
   .filter(Boolean);
 }
 async get(id){ const c=await this.repo.get(id); if(!c) throw Object.assign(new Error("Campagne introuvable."),{statusCode:404,code:"CAMPAIGN_NOT_FOUND"}); return this.summarize(c); }
 async verify(agencyIds,destinationIds){ if(agencyIds.length && await this.repo.countAgencies(agencyIds)!==agencyIds.length) throw Object.assign(new Error("Une ou plusieurs agences sont absentes du tenant."),{statusCode:400,code:"INVALID_CAMPAIGN_AGENCIES"}); if(destinationIds.length && await this.repo.countDestinations(destinationIds)!==destinationIds.length) throw Object.assign(new Error("Une ou plusieurs destinations sont absentes du tenant."),{statusCode:400,code:"INVALID_CAMPAIGN_DESTINATIONS"}); }
 async create(input){ const d=validateCampaignInput(input); const agencyIds=d.agencyIds||[],destinationIds=d.destinationIds||[]; await this.verify(agencyIds,destinationIds); delete d.agencyIds;delete d.destinationIds;delete d.channels; return this.summarize(await this.repo.create(d,agencyIds,destinationIds)); }
 async update(id,input){ await this.get(id); const d=validateCampaignInput(input,{partial:true}); const agencyIds=Object.hasOwn(d,"agencyIds")?d.agencyIds:null,destinationIds=Object.hasOwn(d,"destinationIds")?d.destinationIds:null; await this.verify(agencyIds||[],destinationIds||[]); delete d.agencyIds;delete d.destinationIds;delete d.channels; return this.summarize(await this.repo.update(id,d,agencyIds,destinationIds)); }
 async remove(id){ const deleted=await this.repo.remove(id); if(!deleted) throw Object.assign(new Error("Campagne introuvable."),{statusCode:404,code:"CAMPAIGN_NOT_FOUND"}); return {deleted:true,id}; }
 buildTasks(campaign,channels){ const destinations=campaign.destinations||[]; const targets=destinations.length?destinations:[{destination:{id:"generic",slug:"campagne",name:campaign.name}}]; return targets.flatMap(({destination})=>channels.map(channel=>({key:`${destination.id}:${channel}`,type:channel==="landing-page"||channel==="faq"?"seo":channel==="newsletter"?"email":channel==="hero-image"?"visual":"social",channel,payload:{destinationId:destination.id,destinationSlug:destination.slug,destinationName:destination.name,campaignName:campaign.name}}))); }
 async generate(id,input={}){ const campaign=await this.get(id); const channels=input.channels?validateCampaignInput({name:campaign.name,channels:input.channels}).channels:DEFAULT_CHANNELS; const tasks=this.buildTasks(campaign,channels); await this.repo.createTasks(id,tasks); await this.repo.update(id,{status:"planned",progress:0},null,null); return this.get(id); }
 async listAssets(id,filters={}){
  await this.get(id);
  return this.repo.listAssets(id,{
   status:filters.status||undefined,
   channel:filters.channel||undefined,
   type:filters.type||undefined
  });
 }

 async createOfferAsset(campaignId,input={}){
  await this.get(campaignId);

  const validated=validateOfferAssetInput(input);

  return this.repo.createAsset({
   campaignId,
   type:"offer",
   channel:"site",
   status:"review",
   title:validated.title,
   payload:validated.payload,
   metadata:{
    source:"campaign-to-site-offers",
    version:"25.4",
    createdAt:new Date().toISOString()
   }
  });
 }

 async getAsset(campaignId,assetId){
  await this.get(campaignId);

  const asset=
   await this.repo.getAsset(
    campaignId,
    assetId
   );

  if(!asset){
   throw Object.assign(
    new Error("Contenu de campagne introuvable."),
    {
     statusCode:404,
     code:"CAMPAIGN_ASSET_NOT_FOUND"
    }
   );
  }

  return asset;
 }

 async reviewAsset(
  campaignId,
  assetId,
  input={}
 ){
  const asset=
   await this.getAsset(
    campaignId,
    assetId
   );

  const decision=
   validateAssetDecision(input);

  if(
   asset.status==="approved" &&
   decision.status==="review"
  ){
   throw Object.assign(
    new Error(
     "Un contenu approuvé ne peut pas revenir automatiquement en relecture."
    ),
    {
     statusCode:409,
     code:"APPROVED_ASSET_REVIEW_LOCKED"
    }
   );
  }

  if(decision.status==="approved"){
   assertOfferAssetPublishable(asset);
  }

  return this.repo.updateAsset(
   asset.id,
   {
    status:decision.status,
    metadata:buildReviewMetadata(
     asset.metadata,
     decision
    )
   }
  );
 }

 async approveAsset(
  campaignId,
  assetId,
  input={}
 ){
  return this.reviewAsset(
   campaignId,
   assetId,
   {
    ...input,
    status:"approved"
   }
  );
 }

 async rejectAsset(
  campaignId,
  assetId,
  input={}
 ){
  return this.reviewAsset(
   campaignId,
   assetId,
   {
    ...input,
    status:"rejected"
   }
  );
 }

}
module.exports={CampaignService,DEFAULT_CHANNELS};
