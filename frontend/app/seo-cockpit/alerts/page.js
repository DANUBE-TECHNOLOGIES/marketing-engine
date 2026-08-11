import Link from "next/link";
import MainLayout from "../../components/MainLayout";
import AnomalyStateControls from "./AnomalyStateControls";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(process.env.BACKEND_INTERNAL_URL || process.env.API_INTERNAL_URL || "http://backend:4000").replace(/\/+$/g, "");
}

async function loadAlerts() {
  const response = await fetch(`${backendOrigin()}/api/agency-launch/network`, {
    headers: { Accept: "application/json", "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SEO alerts HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

function severityClass(severity) {
  return severity === "critical"
    ? "border-red-300 bg-red-50 text-red-950"
    : "border-amber-300 bg-amber-50 text-amber-950";
}
function lifecycleLabel(status){if(status==="investigating")return"En analyse";if(status==="resolved")return"Résolue";if(status==="ignored")return"Ignorée";return"Nouvelle";}

export default async function SeoAlertsPage() {
  let payload = null;
  let error = null;
  try { payload = await loadAlerts(); } catch (loadError) { error = loadError; }
  const anomalies = payload?.seoAnomalies || {};
  const alerts = Array.isArray(anomalies.alerts) ? anomalies.alerts : [];

  return (
    <MainLayout title="Centre d’alertes SEO" subtitle="Anomalies de visibilité à diagnostiquer, suivre et clôturer avant toute modification des mini-sites.">
      <div className="mb-5 flex flex-wrap gap-3"><Link href="/seo-cockpit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">← Cockpit SEO</Link></div>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">{error.message}</div> : <>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Alertes</div><div className="mt-2 text-3xl font-black">{anomalies.total || 0}</div></div>
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Nouvelles</div><div className="mt-2 text-3xl font-black">{anomalies.new || 0}</div></div>
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">En analyse</div><div className="mt-2 text-3xl font-black text-blue-700">{anomalies.investigating || 0}</div></div>
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Critiques</div><div className="mt-2 text-3xl font-black text-red-700">{anomalies.critical || 0}</div></div>
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Résolues</div><div className="mt-2 text-3xl font-black text-emerald-700">{anomalies.resolved || 0}</div></div>
          <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Ignorées</div><div className="mt-2 text-3xl font-black text-slate-600">{anomalies.ignored || 0}</div></div>
        </div>

        <div className="mt-6 space-y-5">
          {alerts.map((alert, index) => {
            const response = alert.response || {};
            return <article key={`${alert.agency?.id}-${alert.type}-${alert.keywordId || alert.days || index}`} className={`rounded-2xl border p-6 shadow-sm ${severityClass(alert.severity)}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black uppercase">{alert.severity === "critical" ? "Critique" : "Avertissement"}</span><span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold">{lifecycleLabel(alert.lifecycle?.status)}</span>{alert.agency?.id ? <Link href={`/seo-cockpit/${alert.agency.id}`} className="font-bold hover:underline">{alert.agency?.name || `Agence #${alert.agency.id}`}{alert.agency?.city ? ` · ${alert.agency.city}` : ""}</Link> : null}</div><h2 className="mt-3 text-xl font-black">{alert.title}</h2><p className="mt-2 text-sm leading-6 opacity-85">{alert.detail}</p></div><div className="rounded-xl bg-white/75 px-4 py-3 text-sm"><div><span className="opacity-60">Urgence :</span> <strong>{response.urgency === "immediate" ? "immédiate" : "à examiner"}</strong></div><div className="mt-1"><span className="opacity-60">Responsable :</span> <strong>{response.owner || "SEO"}</strong></div></div></div>
              <div className="mt-5 rounded-xl bg-white/80 p-4"><div className="text-xs font-bold uppercase tracking-wide opacity-60">Premier contrôle</div><div className="mt-1 font-bold">{response.firstAction || "Analyser l’anomalie avant toute intervention."}</div></div>
              {Array.isArray(response.checks) && response.checks.length ? <div className="mt-4"><div className="text-sm font-black">Checklist de diagnostic</div><ol className="mt-2 space-y-2 text-sm">{response.checks.map((item, itemIndex) => <li key={item} className="rounded-lg bg-white/60 px-3 py-2"><strong>{itemIndex + 1}.</strong> {item}</li>)}</ol></div> : null}
              <AnomalyStateControls agencyId={alert.agency?.id} alert={alert}/>
              <div className="mt-4 text-xs font-semibold opacity-70">{response.note || "Aucune correction automatique n’est autorisée sur une anomalie SEO."}</div>
            </article>;
          })}
          {!alerts.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center font-semibold text-emerald-800">Aucune anomalie SEO significative détectée actuellement.</div> : null}
        </div>
      </>}
    </MainLayout>
  );
}
