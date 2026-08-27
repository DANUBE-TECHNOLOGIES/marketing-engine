"use server";

import { redirect } from "next/navigation";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}

export async function createPilotCampaign(formData){
  const rolloutStage=[50,100].includes(Number(formData.get("rolloutStage")))?Number(formData.get("rolloutStage")):null;
  const extended=!rolloutStage&&String(formData.get("extended")||"")==="true";
  const rawIds=String(formData.get("agencyIds")||"").split(",").map(Number).filter(Number.isInteger);
  const agencyIds=rolloutStage?rawIds.slice(0,20):rawIds.slice(0,extended?3:1);
  const preflightId=String(formData.get("preflightId")||"").trim()||null;
  const name=String(formData.get("name")||"").trim()||null;
  const response=await fetch(`${origin()}/api/presence/pilot/campaign`,{
    method:"POST",
    headers:{"content-type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"},
    body:JSON.stringify({confirm:true,extended,rolloutStage,agencyIds,preflightId,name,allowSensitive:false,requireNoSensitive:true,minGoogleCoveragePercent:80}),
    cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  const modeQuery=rolloutStage?`rolloutStage=${rolloutStage}&`:extended?"extended=1&":"";
  if(!response.ok||!data?.campaign?.campaignId) redirect(`/presence/pilot?${modeQuery}agencyIds=${encodeURIComponent(agencyIds.join(","))}&error=${encodeURIComponent(data?.error||"Création campagne pilote refusée")}`);
  redirect(`/presence/campaigns/${encodeURIComponent(data.campaign.campaignId)}`);
}
