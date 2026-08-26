import Link from "next/link";
import MainLayout from "../../components/MainLayout";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(
    process.env.BACKEND_INTERNAL_URL ||
      process.env.API_INTERNAL_URL ||
      process.env.INTERNAL_API_URL ||
      "http://backend:4000"
  ).replace(/\/+$/g, "");
}

async function loadRuntimeStatus() {
  const response = await fetch(
    `${backendOrigin()}/minisite-semantic-engine/post-rollback-status`,
    {
      headers: {
        Accept: "application/json",
        "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale",
      },
      cache: "no-store",
    }
  );
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text || `HTTP ${response.status}` };
  }
  if (!response.ok && response.status !== 503) {
    throw new Error(payload?.message || `Runtime verification HTTP ${response.status}`);
  }
  return payload;
}

function statusLabel(status) {
  if (status === "healthy") return "Vérifié";
  if (status === "attention") return "Action requise";
  if (status === "error") return "Erreur de lecture";
  return "En attente";
}

function statusClass(status) {
  if (status === "healthy") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "attention") return "border-amber-200 bg-amber-50 text-amber-950";
  if (status === "error") return "border-red-200 bg-red-50 text-red-950";
  return "border-slate-200 bg-slate-50 text-slate-950";
}

function YesNo({ value }) {
  return <span className="font-black">{value ? "Oui" : "Non"}</span>;
}

export default async function RuntimeVerificationPage() {
  let payload;
  let error;
  try {
    payload = await loadRuntimeStatus();
  } catch (caught) {
    error = caught;
  }

  return (
    <MainLayout
      title="État runtime après rollback"
      subtitle="Lecture réelle des rapports de rollback gardé et de vérification post-rollback. Aucun correctif automatique ni écriture publique n'est déclenché depuis ce cockpit."
    >
      <div className="mb-5">
        <Link href="/seo-cockpit" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Retour au cockpit SEO réseau
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <div className="font-black">Runtime indisponible</div>
          <div className="mt-2 text-sm">{error.message}</div>
        </div>
      ) : (
        <>
          <section className={`rounded-2xl border p-6 shadow-sm ${statusClass(payload?.status)}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide opacity-70">État runtime réel</div>
                <h2 className="mt-1 text-2xl font-black">{statusLabel(payload?.status)}</h2>
                <p className="mt-2 text-sm opacity-85">{payload?.state || "—"}</p>
                <p className="mt-1 text-xs opacity-70">{payload?.reason || "—"}</p>
              </div>
              <div className="rounded-xl bg-white/70 px-4 py-3 text-sm">
                Lecture seule : <YesNo value={payload?.readOnly === true} /> · Écritures : <YesNo value={payload?.writes === true} />
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Rollback gardé</h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">Rapport disponible</dt><dd><YesNo value={payload?.rollback?.available} /></dd></div>
                <div><dt className="text-slate-500">Audit certifié</dt><dd><YesNo value={payload?.rollback?.certified} /></dd></div>
                <div><dt className="text-slate-500">Mini-site</dt><dd className="font-semibold">{payload?.rollback?.siteSlug || "—"}</dd></div>
                <div><dt className="text-slate-500">Page</dt><dd className="font-semibold">{payload?.rollback?.page || "—"}</dd></div>
              </dl>
              {payload?.rollback?.pageIdentity ? <div className="mt-4 break-all text-xs text-slate-500">Page identity : {payload.rollback.pageIdentity}</div> : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Vérification post-rollback</h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">Rapport disponible</dt><dd><YesNo value={payload?.verification?.available} /></dd></div>
                <div><dt className="text-slate-500">Certification valide</dt><dd><YesNo value={payload?.verification?.certified} /></dd></div>
                <div><dt className="text-slate-500">Incident récupéré</dt><dd>{payload?.verification?.incidentRecovered == null ? "—" : <YesNo value={payload.verification.incidentRecovered} />}</dd></div>
                <div><dt className="text-slate-500">Intervention manuelle</dt><dd>{payload?.verification?.manualInterventionRequired == null ? "—" : <YesNo value={payload.verification.manualInterventionRequired} />}</dd></div>
              </dl>
              {payload?.verification?.generatedAt ? <div className="mt-4 text-xs text-slate-500">Rapport : {new Date(payload.verification.generatedAt).toLocaleString("fr-FR")}</div> : null}
              {payload?.verification?.fingerprint ? <div className="mt-2 break-all text-xs text-slate-500">Fingerprint : {payload.verification.fingerprint}</div> : null}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Garde-fous runtime</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Réparation auto</div><div className="font-black">Interdite</div></div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Écritures auto</div><div className="font-black">{payload?.invariants?.automaticWriteCount ?? 0}</div></div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Pages créées</div><div className="font-black">{payload?.invariants?.pageCreationCount ?? 0}</div></div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Publications</div><div className="font-black">{payload?.invariants?.publicationCount ?? 0}</div></div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="text-slate-500">Mutations Designer</div><div className="font-black">{payload?.invariants?.websiteDesignerMutationCount ?? 0}</div></div>
            </div>
          </section>
        </>
      )}
    </MainLayout>
  );
}
