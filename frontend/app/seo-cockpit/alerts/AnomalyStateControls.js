"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function AnomalyStateControls({agencyId,alert}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function setStatus(status){let reason="";if(status==="ignored"){reason=window.prompt("Pourquoi cette alerte doit-elle être ignorée ?")||"";if(!reason.trim())return;}
    setBusy(true);setMessage("");try{const r=await fetch(`/api/agency-launch/agencies/${agencyId}/seo-anomalies/state`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({fingerprint:alert.fingerprint,status,reason})});if(!r.ok)throw new Error(await r.text());setMessage("Statut enregistré.");router.refresh();}catch(e){setMessage(`Erreur : ${e.message}`);}finally{setBusy(false)}
  }
  const current=alert.lifecycle?.status||"new";
  return <div className="mt-4 rounded-xl bg-white/80 p-4"><div className="text-xs font-bold uppercase tracking-wide opacity-60">Suivi de l’alerte</div><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy||current==="investigating"} onClick={()=>setStatus("investigating")} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Prendre en analyse</button><button disabled={busy||current==="resolved"} onClick={()=>setStatus("resolved")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40">Marquer résolue</button><button disabled={busy||current==="ignored"} onClick={()=>setStatus("ignored")} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">Ignorer avec justification</button></div><div className="mt-2 text-xs opacity-70">Statut actuel : <strong>{current}</strong>{alert.lifecycle?.reason?` · ${alert.lifecycle.reason}`:""}</div>{message?<div className="mt-2 text-xs font-semibold">{message}</div>:null}</div>;
}
