"use server";

import { revalidatePath } from "next/cache";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}

export async function freezePresenceRolloutDecision(formData){
  const acknowledgementReason=String(formData?.get?.("acknowledgementReason")||"").trim();
  const actorId=String(process.env.PRESENCE_OPERATOR_ID||"presence_cockpit_operator").trim()||"presence_cockpit_operator";
  const response=await fetch(`${origin()}/api/presence/network/rollout-decision/freeze`,{
    method:"POST",
    headers:{"content-type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale","x-presence-operator":actorId},
    body:JSON.stringify({confirm:true,acknowledgementReason,actorId}),
    cache:"no-store"
  });
  if(!response.ok) throw new Error(`Gel décision rollout refusé: ${await response.text()}`);
  revalidatePath("/presence");
}
