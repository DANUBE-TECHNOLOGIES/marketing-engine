import Link from "next/link";
import MainLayout from "../../components/MainLayout";
import MarkSeoActionDoneButton from "./MarkSeoActionDoneButton";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(process.env.BACKEND_INTERNAL_URL || process.env.API_INTERNAL_URL || "http://backend:4000").replace(/\/+$/g, "");
}

async function api(path) {
  const response = await fetch(`${backendOrigin()}${path}`, { headers: { Accept: "application/json", "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale" }, cache: "no-store" });
  if (!response.ok) throw new Error(`SEO agency HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

function check(report, code) {
  return (Array.isArray(report?.checks) ? report.checks : []).find((item) => item?.code === code) || null;
}

function Stat({ label, value, hint }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</div>;
}

function statusText(status) {
  if (status === "improving") return "En progression";
  if (status === "declining") return "En recul";
  if (status === "stable") return "Stable";
  return "Données insuffisantes";
}

function statusClass(status) {
  if (status === "improving") return "text-emerald-700 bg-emerald-50";
  if (status === "declining") return "text-red-700 bg-red-50";
  if (status === "stable") return "text-slate-700 bg-slate-100";
  return "text-amber-700 bg-amber-50";
}

export default async function AgencySeoPage({ params }) {
  const resolved = await params;
  const agencyId = Number(resolved.agencyId);
  let report = null;
  let history = null;
  let error = null;
  try {
    [report, history] = await Promise.all([api(`/api/agency-launch/agencies/${agencyId}/readiness`), api(`/api/agency-launch/agencies/${agencyId}/seo-actions/history?limit=50`)]);
  } catch (loadError) { error = loadError; }

  const agency = report?.agency || {};
  const rankings = check(report, "LOCAL_RANKINGS") || {};
  const citations = check(report, "LOCAL_CITATIONS") || {};
  const trust = check(report, "LOCAL_TRUST") || {};
  const localSeo = check(report, "LOCAL_SEO") || {};
  const content = check(report, "LOCAL_CONTENT") || {};
  const similarity = check(report, "CONTENT_SIMILARITY") || {};
  const actions = Array.isArray(report?.seoActions?.actions) ? report.seoActions.actions : [];
  const observing = Array.isArray(report?.seoActions?.suppressed) ? report.seoActions.suppressed : [];
  const rankingItems = Array.isArray(rankings.items) ? rankings.items : [];
  const inconsistencies = Array.isArray(citations.inconsistencies) ? citations.inconsistencies : [];
  const pastActions = Array.isArray(history?.actions) ? history.actions : [];

  return (
    <MainLayout title={`SEO · ${agency.name || `Agence #${agencyId}`}`} subtitle={`${agency.city || "Ville non renseignée"} · visibilité locale, actions et mesure d'impact.`}>
      <div className="mb-5 flex flex-wrap gap-3">
        <Link href="/seo-cockpit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Cockpit réseau</Link>
        <Link href={`/website-builder?agencyId=${agencyId}`} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Ouvrir le Designer</Link>
        {report?.site?.slug ? <Link href={`/agence/${report.site.slug}`} target="_blank" className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900">Voir le mini-site</Link> : null}
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">Impossible de charger le détail SEO : {error.message}</div> : <>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-7">
          <Stat label="Readiness" value={`${Number(report?.readiness?.score || 0)}/100`} />
          <Stat label="Top 10" value={rankings.top10Keywords || 0} hint={`${rankings.freshKeywords || 0} mots-clés frais`} />
          <Stat label="Top 20" value={rankings.top20Keywords || 0} />
          <Stat label="En progression" value={rankings.improvingKeywords || 0} />
          <Stat label="En recul" value={rankings.decliningKeywords || 0} />
          <Stat label="Actions ouvertes" value={actions.length} />
          <Stat label="En observation" value={observing.length} hint="Actions récemment réalisées" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-bold text-slate-950">Positions locales</h2><p className="mt-1 text-sm text-slate-500">Positions réellement mesurées et tendance récente.</p></div>
            <div className="divide-y divide-slate-100">{rankingItems.map((item) => <div key={item.keywordId} className="grid gap-3 px-6 py-4 md:grid-cols-[1.5fr_0.5fr_0.8fr] md:items-center"><div><div className="font-semibold text-slate-900">{item.keyword}</div><div className="mt-1 text-xs text-slate-500">{item.city || agency.city || ""}</div></div><div className="text-2xl font-black text-slate-950">{item.position ?? "—"}</div><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(item.momentum?.status)}`}>{statusText(item.momentum?.status)}</span>{item.momentum?.delta != null ? <div className="mt-1 text-xs text-slate-500">Écart : {item.momentum.delta > 0 ? "+" : ""}{item.momentum.delta}</div> : null}</div></div>)}{!rankingItems.length ? <div className="px-6 py-10 text-center text-slate-500">Aucun ranking suivi.</div> : null}</div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Santé locale</h2><div className="mt-5 space-y-4 text-sm"><div className="flex items-center justify-between"><span className="text-slate-600">Google local</span><strong>{localSeo.passed ? "Complet" : "À compléter"}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Confiance / avis</span><strong>{trust.passed ? "Sain" : "À travailler"}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Contenu local</span><strong>{content.passed ? "Différencié" : "À enrichir"}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Anti-clone</span><strong>{similarity.passed === false ? "Alerte" : "OK"}</strong></div><div className="flex items-center justify-between"><span className="text-slate-600">Citations cohérentes</span><strong>{Math.round(Number(citations.consistencyRate || 0) * 100)} %</strong></div></div></section>
        </div>

        {observing.length ? <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 shadow-sm"><div className="border-b border-blue-200 px-6 py-5"><h2 className="text-xl font-bold text-blue-950">En observation</h2><p className="mt-1 text-sm text-blue-800">Ces optimisations ont été réalisées récemment. Le moteur attend de nouvelles données avant de les reproposer.</p></div><div className="divide-y divide-blue-100">{observing.map((item, index) => <div key={`${item.action?.code}-${index}`} className="grid gap-3 px-6 py-4 md:grid-cols-[1.5fr_0.8fr] md:items-center"><div><div className="font-semibold text-blue-950">{item.action?.title}</div><div className="mt-1 text-sm text-blue-800">{item.action?.detail}</div>{item.action?.keyword ? <div className="mt-1 text-xs text-blue-700">Requête : {item.action.keyword}</div> : null}</div><div className="rounded-xl bg-white/70 p-3 text-sm text-blue-950"><div>Réalisée il y a <strong>{item.ageDays} jour{item.ageDays > 1 ? "s" : ""}</strong></div><div className="mt-1">Réévaluation dans <strong>{item.remainingDays} jour{item.remainingDays > 1 ? "s" : ""}</strong></div></div></div>)}</div></section> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-bold text-slate-950">Actions recommandées</h2><p className="mt-1 text-sm text-slate-500">Une fois l'optimisation réellement effectuée, enregistrez-la pour démarrer automatiquement le suivi d'impact.</p></div><div className="divide-y divide-slate-100">{actions.map((action, index) => <div key={`${action.code}-${index}`} className="px-6 py-4"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{action.priority} · {action.source}</div><div className="mt-1 font-semibold text-slate-950">{action.title}</div><p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p>{action.targetPage?.slug ? <div className="mt-2 text-xs text-slate-500">Cible : /{action.targetPage.slug}</div> : null}<MarkSeoActionDoneButton agencyId={agencyId} action={action} /></div>)}{!actions.length ? <div className="px-6 py-10 text-center text-emerald-700">Aucune action prioritaire actuellement.</div> : null}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-bold text-slate-950">Citations à corriger</h2></div><div className="divide-y divide-slate-100">{inconsistencies.map((item) => <div key={item.listingId} className="px-6 py-4"><div className="font-semibold text-slate-950">{item.directory}</div><div className="mt-1 text-sm text-slate-600">Champs incohérents : {item.fields.join(", ")}</div>{item.listingUrl ? <a href={item.listingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-cyan-800 hover:underline">Ouvrir la fiche</a> : null}</div>)}{!inconsistencies.length ? <div className="px-6 py-10 text-center text-emerald-700">Aucune incohérence publiée détectée.</div> : null}</div></section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-bold text-slate-950">Historique des actions et impact observé</h2><p className="mt-1 text-sm text-slate-500">Baseline avant action puis premières mesures disponibles à J+7, J+14 et J+30.</p></div><div className="divide-y divide-slate-100">{pastActions.map((action) => <div key={action.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.4fr_0.6fr_1fr] lg:items-center"><div><div className="font-semibold text-slate-950">{action.title}</div><div className="mt-1 text-xs text-slate-500">{action.executedAt ? new Date(action.executedAt).toLocaleDateString("fr-FR") : "Date inconnue"}</div></div><div className="text-sm text-slate-600">Baseline : {action.impact?.baseline?.position ?? "—"}</div><div className="flex flex-wrap gap-2">{(action.impact?.windows || []).map((window) => <span key={window.days} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">J+{window.days} : {window.result?.position ?? "—"}{window.delta != null ? ` (${window.delta > 0 ? "+" : ""}${window.delta})` : ""}</span>)}</div></div>)}{!pastActions.length ? <div className="px-6 py-10 text-center text-slate-500">Aucune action SEO exécutée enregistrée pour cette agence.</div> : null}</div></section>
      </>}
    </MainLayout>
  );
}
