import Link from "next/link";
import MainLayout from "../../components/MainLayout";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(process.env.BACKEND_INTERNAL_URL || process.env.API_INTERNAL_URL || process.env.INTERNAL_API_URL || "http://backend:4000").replace(/\/+$/g, "");
}

async function loadOperationalStatus() {
  const response = await fetch(`${backendOrigin()}/minisite-semantic-engine/operational-status`, {
    headers: { Accept: "application/json", "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale" },
    cache: "no-store",
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text || `HTTP ${response.status}` }; }
  if (!response.ok && response.status !== 503) throw new Error(payload?.message || `Operational status HTTP ${response.status}`);
  return payload;
}

function Value({ children }) { return <div className="mt-1 text-2xl font-black text-slate-950">{children}</div>; }
function Card({ label, children, hint }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{label}</div><Value>{children}</Value>{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</div>; }
function stateClass(status) { if (status === "healthy") return "border-emerald-300 bg-emerald-50 text-emerald-950"; if (status === "attention") return "border-amber-300 bg-amber-50 text-amber-950"; if (status === "error") return "border-red-300 bg-red-50 text-red-950"; return "border-slate-300 bg-slate-50 text-slate-950"; }

export default async function OperationalSeoPage() {
  let payload, error;
  try { payload = await loadOperationalStatus(); } catch (caught) { error = caught; }
  const search = payload?.searchConsole || {};
  const pipeline = payload?.pipeline || {};
  const safety = payload?.safety || {};
  const runtime = payload?.runtimeEnv || {};

  return <MainLayout title="Opérations d'indexation" subtitle="État opérationnel réel du moteur de demande Search Console et des garde-fous SEO. Cette vue est strictement en lecture seule.">
    <div className="mb-5 flex flex-wrap gap-4 text-sm font-semibold"><Link href="/seo-cockpit" className="text-slate-600 hover:underline">← Retour au cockpit SEO</Link><Link href="/seo-cockpit/runtime" className="text-slate-600 hover:underline">Runtime rollback →</Link></div>
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"><div className="font-black">État opérationnel indisponible</div><div className="mt-2 text-sm">{error.message}</div></div> : <>
      <section className={`rounded-2xl border p-6 shadow-sm ${stateClass(payload?.status)}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-xs font-bold uppercase tracking-wide opacity-70">Moteur SEO opérationnel</div><h2 className="mt-1 text-2xl font-black">{payload?.nextAction || payload?.reason || "En attente"}</h2><p className="mt-2 text-sm opacity-85">{payload?.state || "—"}</p></div><div className="rounded-xl bg-white/70 px-4 py-3 text-sm">Lecture seule : <strong>{payload?.readOnly === true ? "Oui" : "Non"}</strong> · Écritures : <strong>{payload?.writes === true ? "Oui" : "Non"}</strong></div></div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card label="Search Console">{search.dataState || "—"}</Card>
        <Card label="Cycle de demande">{search.lifecycleState || payload?.state || "—"}</Card>
        <Card label="Signaux à revoir">{pipeline.reviewItemCount ?? 0}</Card>
        <Card label="Priorisés">{pipeline.prioritizedReviewItemCount ?? 0}</Card>
        <Card label="Dossiers décision">{pipeline.decisionPacketCount ?? 0}</Card>
        <Card label="Gate humain">{payload?.humanGate?.required ? "REQUIS" : "NON"}</Card>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Runtime Search Console</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 text-sm">
          <div><div className="text-slate-500">DATABASE_URL chargé</div><div className="font-black">{runtime.databaseConfigured == null ? "—" : runtime.databaseConfigured ? "Oui" : "Non"}</div></div>
          <div><div className="text-slate-500">Hôte base</div><div className="font-black break-all">{runtime.databaseHost || "—"}</div></div>
          <div><div className="text-slate-500">Credentials Google</div><div className="font-black">{runtime.googleClientConfigured == null ? "—" : runtime.googleClientConfigured ? "Oui" : "Non"}</div></div>
          <div><div className="text-slate-500">Redirect OAuth</div><div className="font-black">{runtime.googleRedirectUriConfigured == null ? "—" : runtime.googleRedirectUriConfigured ? "Oui" : "Non"}</div></div>
          <div><div className="text-slate-500">Override DB host</div><div className="font-black">{runtime.hostDatabaseOverrideApplied ? "Oui" : "Non"}</div></div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Garde-fous</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5 text-sm">
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Exécutables</div><div className="font-black">{safety.executableCount ?? 0}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Écritures auto</div><div className="font-black">{safety.automaticWriteCount ?? 0}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Pages créées</div><div className="font-black">{safety.pageCreationCount ?? 0}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Publications</div><div className="font-black">{safety.publicationCount ?? 0}</div></div>
          <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Mutations Designer</div><div className="font-black">{safety.websiteDesignerMutationCount ?? 0}</div></div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600"><div><strong>Rapport :</strong> {payload?.reportPath || "aucun rapport certifié"}</div>{payload?.generatedAt ? <div className="mt-2"><strong>Observation :</strong> {new Date(payload.generatedAt).toLocaleString("fr-FR")}</div> : null}{payload?.statusFingerprint ? <div className="mt-2 break-all"><strong>Fingerprint :</strong> {payload.statusFingerprint}</div> : null}</section>
    </>}
  </MainLayout>;
}
