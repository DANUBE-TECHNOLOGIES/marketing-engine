"use server";

import { redirect } from "next/navigation";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}

export async function createPilotCampaign(formData){
  const agencyIds=String(formData.get("agencyIds")||"").split(",").map(Number).filter(Number.isInteger);
  const preflightId=String(formData.get("preflightId")||"").trim()||null;
  const name=String(formData.get("name")||"").trim()||null;
  const response=await fetch(`${origin()}/api/presence/pilot/campaign`,{
    method:"POST",
    headers:{"content-type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"},
    body:JSON.stringify({confirm:true,agencyIds,preflightId,name,maxAgencies:3,maxItems:10,allowSensitive:false,requireNoSensitive:true,minGoogleCoveragePercent:80}),
    cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data?.campaign?.campaignId) redirect(`/presence/pilot?agencyIds=${encodeURIComponent(agencyIds.join(","))}&error=${encodeURIComponent(data?.error||"Création campagne pilote refusée")}`);
  redirect(`/presence/campaigns/${encodeURIComponent(data.campaign.campaignId)}`);
}
