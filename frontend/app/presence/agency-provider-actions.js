"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}
function headers(){return {"Content-Type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"}}
async function post(path,body){const r=await fetch(`${origin()}${path}`,{method:"POST",headers:headers(),body:JSON.stringify(body),cache:"no-store"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Presence HTTP ${r.status}`);return data}

export async function recordObservationAction(formData){
  const agencyId=Number(formData.get("agencyId"));
  const providerKey=String(formData.get("providerKey")||"");
  const observed={name:String(formData.get("name")||""),address:String(formData.get("address")||""),phone:String(formData.get("phone")||""),website:String(formData.get("website")||"")};
  const listingUrl=String(formData.get("listingUrl")||"")||null;
  await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/observe`,{confirm:true,observed,listingUrl});
  revalidatePath(`/presence/agencies/${agencyId}/providers/${providerKey}`);
  revalidatePath("/presence");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?saved=1`);
}

export async function startDiscoveryAction(formData){
  const agencyId=Number(formData.get("agencyId"));
  const providerKey=String(formData.get("providerKey")||"");
  const result=await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/discovery/start`,{});
  const ids=(result.tasks||[]).map(t=>t.taskId).filter(Boolean).join(",");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?discovery=${encodeURIComponent(ids)}`);
}
