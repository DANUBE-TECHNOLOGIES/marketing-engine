"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}
function headers(){return {"Content-Type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"}}
async function post(path,body){const r=await fetch(`${origin()}${path}`,{method:"POST",headers:headers(),body:JSON.stringify(body),cache:"no-store"});const data=await r.json().catch(()=>({}));if(!r.ok){const error=new Error(data.error||`Presence HTTP ${r.status}`);error.payload=data;throw error}return data}

export async function recordObservationAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const observed={name:String(formData.get("name")||""),address:String(formData.get("address")||""),phone:String(formData.get("phone")||""),website:String(formData.get("website")||"")};
  const listingUrl=String(formData.get("listingUrl")||"")||null;
  await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/observe`,{confirm:true,observed,listingUrl});
  revalidatePath(`/presence/agencies/${agencyId}/providers/${providerKey}`); revalidatePath("/presence");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?saved=1`);
}

export async function startDiscoveryAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const result=await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/discovery/start`,{confirm:true});
  const ids=(result.tasks||[]).map(t=>t.taskId).filter(Boolean).join(",");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?discovery=${encodeURIComponent(ids)}`);
}

export async function loadDiscoveryResultsAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const taskIds=String(formData.get("taskIds")||"").split(",").map(v=>v.trim()).filter(Boolean);
  const result=await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/discovery/result`,{taskIds});
  const encoded=Buffer.from(JSON.stringify(result.candidates||[]),"utf8").toString("base64url");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?discovery=${encodeURIComponent(taskIds.join(","))}&candidates=${encoded}`);
}

export async function selectDiscoveryCandidateAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const taskIds=String(formData.get("taskIds")||"").split(",").map(v=>v.trim()).filter(Boolean);
  const candidateUrl=String(formData.get("candidateUrl")||"");
  const confirmLowConfidence=formData.get("confirmLowConfidence")==="on";
  await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/discovery/result`,{taskIds,confirm:true,candidateUrl,minimumScore:80,confirmLowConfidence});
  revalidatePath(`/presence/agencies/${agencyId}/providers/${providerKey}`); revalidatePath("/presence");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?candidateSaved=1`);
}

export async function startManualRemediationAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const drift=String(formData.get("drift")||"").split(",").map(v=>v.trim()).filter(Boolean);
  const note=String(formData.get("note")||"")||null;
  const result=await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/manual-remediation/start`,{confirm:true,drift,note});
  revalidatePath(`/presence/agencies/${agencyId}/providers/${providerKey}`); revalidatePath("/presence"); revalidatePath("/actions");
  redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?manualStarted=${encodeURIComponent(result.operationId||"1")}`);
}

export async function verifyManualRemediationAction(formData){
  const agencyId=Number(formData.get("agencyId")); const providerKey=String(formData.get("providerKey")||"");
  const observed={name:String(formData.get("name")||""),address:String(formData.get("address")||""),phone:String(formData.get("phone")||""),website:String(formData.get("website")||"")};
  const listingUrl=String(formData.get("listingUrl")||"")||null;
  const evidence=String(formData.get("evidence")||"")||null;
  const operationId=String(formData.get("operationId")||"")||undefined;
  try {
    await post(`/api/presence/agencies/${agencyId}/providers/${encodeURIComponent(providerKey)}/manual-remediation/verify`,{confirm:true,operationId,observed,listingUrl,evidence});
    revalidatePath(`/presence/agencies/${agencyId}/providers/${providerKey}`); revalidatePath("/presence"); revalidatePath("/actions");
    redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?manualVerified=1`);
  } catch (error) {
    const drift=error.payload?.result?.diff?.drift||error.payload?.result?.drift||[];
    redirect(`/presence/agencies/${agencyId}/providers/${providerKey}?manualPending=${encodeURIComponent(drift.join(",")||"1")}`);
  }
}
