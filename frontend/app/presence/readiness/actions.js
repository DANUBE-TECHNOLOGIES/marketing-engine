"use server";

import { revalidatePath } from "next/cache";

function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}

export async function freezePresencePreflight(){
  const response=await fetch(`${origin()}/api/presence/health/deployment-readiness/freeze`,{
    method:"POST",
    headers:{"Content-Type":"application/json",Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"},
    body:JSON.stringify({confirm:true}),
    cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||`Freeze preflight HTTP ${response.status}`);
  revalidatePath("/presence/readiness");
  return data;
}
