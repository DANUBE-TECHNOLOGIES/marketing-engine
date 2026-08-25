import MainLayout from "../../../../components/MainLayout";
import Link from "next/link";
import { recoverPresenceCampaign, qualifyPresenceRecoveryItem } from "../../actions";

export const dynamic="force-dynamic";
function origin(){return String(process.env.BACKEND_INTERNAL_URL||process.env.API_INTERNAL_URL||"http://backend:4000").replace(/\/+$/g,"")}
async function get(path){const r=await fetch(`${origin()}${path}`,{headers:{Accept:"application/json","x-tenant-slug":process.env.NEXT_PUBLIC_TENANT_SLUG||"mondescale"},cache:"no-store"});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return {ok:r.ok,status:r.status,data}}
function Card({title,count,children,tone="slate"}){const cls=tone==="green"?"border-emerald-200 bg-emerald-50":tone==="red"?"border-red-200 bg-red-50":tone==="amber"?"border-amber-200 bg-amber-50":"border-slate-200 bg-white";return <section className={`rounded-2xl border p-5 ${cls}`}><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black">{title}</h2><div className="rounded-full bg-white px-3 py-1 text-sm font-black">{count}</div></div>{children}</section>}
function qualificationLabel(value){if(value==="already_applied")return "Déjà appliqué chez Google";if(value==="not_applied")return "Non appliqué chez Google";if(value==="partial_or_changed")return "État partiel / différent";return "Non qualifié"}
function operatorLabel(value){if(value==="safe_recovery")return "Reprise sûre";if(value==="safe_recovery_with_manual_followup")return "Reprise sûre avec suivi manuel";return "Qualification requise"}
function Items({items=[],campaignId,qualifications={}}){return items.length?<div className="mt-4 space-y-2">{items.map((x,i)=>{const index=Number(x.campaignIndex??x.sourceCampaignIndex??i);const q=qualifications[index];return <div key={`${index}-${x.agencyId??"x"}`} className="rounded-xl border bg-white/80 p-3 text-sm"><div className="font-bold">Agence {x.agencyId??"—"} · {x.providerKey||"provider"}</div><div className="mt-1 text-slate-600">{Array.isArray(x.drift)?x.drift.join(", "):x.status||x.reason||"—"}</div>{x.operationId?<div className="mt-1 font-mono text-xs text-slate-500">operationId {x.operationId}</div>:null}{q?<div className="mt-3 rounded-lg bg-slate-50 p-3"><div className="font-bold">{qualificationLabel(q.status||q.result?.classification)}</div><div className="mt-1 text-xs text-slate-600">Lecture Google du {q.createdAt?new Date(q.createdAt).toLocaleString("fr-FR"):q.result?.observedAt||"—"}. Retry automatique : interdit.</div></div>:campaignId&&x.operationId?<form action={qualifyPresenceRecoveryItem.bind(null,campaignId,index)} className="mt-3"><button className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950">Qualifier par lecture Google</button></form>:null}</div>})}</div>:<p className="mt-3 text-sm text-slate-600">Aucun item.</p>}

export default async function Page({params}){
  const {campaignId}=await params;
  const response=await get(`/api/presence/campaigns/${encodeURIComponent(campaignId)}/recovery-preview`);
  const d=response.data||{};
  const plan=d.plan||{};
  const eligibility=d.eligibility||{};
  const qualificationState=d.qualificationState||{};
  const safe=plan.executable||[];
  const uncertain=eligibility.uncertain||plan.uncertain||[];
  const excluded=eligibility.alreadyProcessed||plan.alreadyProcessed||[];
  const qualificationMap=Object.fromEntries((d.qualifications||[]).map(q=>[Number(q.payload?.campaignIndex),q]));
  const blockers=d.readiness?.blockers||[];
  const ready=response.ok&&d.readiness?.ready===true;
  const operatorState=d.readiness?.operatorState||"qualification_required";
  return <MainLayout title="Reprise contrôlée Presence" subtitle={`Campagne source ${campaignId}`}>
    <div className="mb-5"><Link href={`/presence/campaigns/${campaignId}`} className="text-sm font-bold text-[#073653]">← Retour à la campagne</Link></div>
    <section className={`mb-6 rounded-2xl border p-6 ${ready?"border-emerald-300 bg-emerald-50":"border-red-300 bg-red-50"}`}>
      <div className="text-xs font-black uppercase tracking-wide">Recovery gate</div>
      <div className="mt-2 flex flex-wrap items-end gap-4"><div className="text-4xl font-black">{ready?"GO":"NO-GO"}</div><div className="rounded-full bg-white px-3 py-1 text-sm font-black">{operatorLabel(operatorState)}</div></div>
      <p className="mt-2 text-sm">Preflight courant : <span className="font-mono">{d.preflightId||"absent"}</span>. Une reprise crée toujours une nouvelle campagne et n’effectue aucune écriture externe à cette étape.</p>
      {uncertain.length?<p className="mt-2 text-sm">Qualification des ambiguïtés : {uncertain.length-(qualificationState.unresolvedCount||0)}/{uncertain.length}. Les {qualificationState.unresolvedCount||0} item(s) restant(s) bloquent la création.</p>:null}
      {qualificationState.manualInterventionRequired?<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Une ou plusieurs qualifications indiquent un état non appliqué ou partiel. Elles restent exclues de la reprise automatique et nécessitent un suivi manuel séparé.</div>:null}
      {blockers.length?<div className="mt-4 rounded-xl bg-white/70 p-4 text-sm font-semibold">Blocages : {blockers.join(", ")}</div>:null}
    </section>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Sûrs à reprendre" count={safe.length} tone="green"><p className="mt-2 text-sm text-emerald-900">Items n’ayant jamais créé de ligne d’exécution. Eux seuls peuvent entrer dans la nouvelle campagne.</p><Items items={safe}/></Card>
      <Card title="Ambigus à vérifier" count={uncertain.length} tone="amber"><p className="mt-2 text-sm text-amber-900">Chaque ambiguïté doit être qualifiée avant toute reprise. La lecture Google reste sans écriture et ne transforme jamais automatiquement l’item en retry.</p><Items items={uncertain} campaignId={campaignId} qualifications={qualificationMap}/></Card>
      <Card title="Déjà traités / exclus" count={excluded.length}><p className="mt-2 text-sm text-slate-700">Ces items restent attachés à la campagne source et ne sont jamais dupliqués.</p><Items items={excluded}/></Card>
    </div>
    <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Créer la nouvelle campagne de reprise</h2>
      <p className="mt-2 text-sm text-slate-600">La campagne source reste définitivement en échec. La reprise utilisera le nouveau preflight et devra repasser par approbation puis démarrage.</p>
      {ready?<form action={recoverPresenceCampaign.bind(null,campaignId)} className="mt-5 flex flex-wrap items-end gap-4"><label className="text-sm font-semibold">Nom de la reprise<input name="name" className="mt-1 block min-w-80 rounded-lg border px-3 py-2" placeholder={`Reprise ${campaignId}`}/></label><button className="rounded-xl bg-[#073653] px-4 py-2 text-sm font-bold text-white">Créer la campagne de reprise</button></form>:<div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm font-semibold">Création désactivée tant que le recovery gate reste NO-GO et que toutes les ambiguïtés ne sont pas qualifiées.</div>}
    </section>
  </MainLayout>
}
