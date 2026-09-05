import Link from "next/link";
import TerritorialActionTracker from "./TerritorialActionTracker";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const TENANT_SLUG = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

async function getJsonOrNull(path) {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      cache: "no-store",
      headers: { "x-tenant-slug": TENANT_SLUG },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function urgencyClasses(urgency) {
  if (urgency === "critical") return "bg-rose-100 text-rose-900 border-rose-200";
  if (urgency === "high") return "bg-orange-100 text-orange-900 border-orange-200";
  if (urgency === "medium") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function priorityClasses(priority) {
  if (priority === "p1") return "bg-rose-100 text-rose-900";
  if (priority === "p2") return "bg-orange-100 text-orange-900";
  if (priority === "p3") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function planHref({ agencyId, keywordId, loadPlan }) {
  const query = new URLSearchParams({
    agencyId: String(agencyId),
    keywordId: String(keywordId),
  });
  if (loadPlan) query.set("territorialPlan", "1");
  return `/ranking-grid?${query.toString()}`;
}

export default async function TerritorialSeoPanel({ campaignId, agencyId, keywordId, loadPlan = false }) {
  const [priorityPayload, trackingPayload] = await Promise.all([
    getJsonOrNull(`/rankings/grid/spatial-priorities?campaignId=${campaignId}`),
    getJsonOrNull(`/rankings/grid/territorial-actions?agencyId=${agencyId}&keywordId=${keywordId}`),
  ]);
  const priority = priorityPayload?.campaigns?.[0] || null;

  if (!priority) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        <h2 className="text-xl font-bold text-slate-900">Recommandations SEO territoriales</h2>
        <p className="mt-2">Aucun diagnostic territorial calibré n’est disponible pour ce relevé.</p>
      </section>
    );
  }

  const summary = priority.summary || {};
  const hasUrgentTerritories = Number(summary.p1 || 0) + Number(summary.p2 || 0) > 0;
  let plan = null;

  // Intentionally lazy: IGN reverse geocoding only runs after the explicit territorialPlan=1 navigation.
  if (loadPlan && hasUrgentTerritories) {
    plan = await getJsonOrNull(`/rankings/grid/spatial-priorities/action-plan?campaignId=${campaignId}&levels=p1,p2`);
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Recommandations SEO territoriales</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Priorités calculées sur la grille calibrée actuelle. Le diagnostic P1/P2/P3 et le suivi sont locaux ; le rattachement aux communes IGN n’est chargé qu’à la demande.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className={`rounded-full px-3 py-1 ${priorityClasses("p1")}`}>P1 {summary.p1 || 0}</span>
          <span className={`rounded-full px-3 py-1 ${priorityClasses("p2")}`}>P2 {summary.p2 || 0}</span>
          <span className={`rounded-full px-3 py-1 ${priorityClasses("p3")}`}>P3 {summary.p3 || 0}</span>
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cellules actionnables</div>
          <div className="mt-1 text-3xl font-black text-[#0f2e46]">{summary.actionableCells || 0}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Direction prioritaire</div>
          <div className="mt-1 text-xl font-black capitalize text-[#0f2e46]">{summary.dominantPriorityDirection || "—"}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions suivies</div>
          <div className="mt-1 text-xl font-black text-[#0f2e46]">{trackingPayload?.summary?.actions || 0}</div>
          <div className="mt-1 text-xs text-slate-500">
            {trackingPayload?.summary?.inProgress || 0} en cours · {trackingPayload?.summary?.done || 0} terminée(s)
          </div>
        </div>
      </div>

      {hasUrgentTerritories && !plan ? (
        <div className="border-t p-6">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
            <div className="font-bold text-slate-900">Des zones P1/P2 nécessitent un plan territorial.</div>
            <p className="mt-1 text-sm text-slate-600">
              Le chargement suivant effectue uniquement le géocodage inverse IGN des cellules prioritaires. Il ne déclenche aucun appel DataForSEO et n’écrit rien en base tant qu’aucune recommandation n’est ajoutée au suivi.
            </p>
            <Link
              href={planHref({ agencyId, keywordId, loadPlan: true })}
              className="mt-4 inline-flex rounded-lg bg-[#0f2e46] px-4 py-2 text-sm font-bold text-white hover:bg-[#163f60]"
            >
              Charger le plan territorial
            </Link>
          </div>
        </div>
      ) : null}

      {plan ? (
        <div className="border-t p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Priorité absolue : {plan.summary?.topPriorityCity || "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {plan.summary?.critical || 0} territoire(s) critique(s) · {plan.summary?.high || 0} élevé(s)
              </div>
            </div>
            <Link
              href={planHref({ agencyId, keywordId, loadPlan: false })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Masquer le plan
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(plan.territories || []).map((territory) => (
              <article key={territory.city} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-900">{territory.city}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${urgencyClasses(territory.urgency)}`}>
                    {territory.urgency}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  P1 {territory.p1} · P2 {territory.p2} · moyenne #{territory.averageRank ?? "—"} · pire #{territory.worstRank ?? "—"}
                </div>
                <div className="mt-3 text-xs text-slate-700">
                  <strong>Objectif :</strong> {territory.objectives?.primary || "—"}
                </div>
              </article>
            ))}
          </div>

          {plan.doorwayGuard ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <strong>Garde-fou SEO :</strong> {plan.doorwayGuard}
            </div>
          ) : null}
        </div>
      ) : null}

      <TerritorialActionTracker
        campaignId={campaignId}
        agencyId={agencyId}
        keywordId={keywordId}
        initialActions={trackingPayload?.actions || []}
        plan={plan}
      />

      {!hasUrgentTerritories ? (
        <div className="border-t p-6 text-sm text-slate-600">
          Aucune zone P1/P2 : maintenir la visibilité actuelle et surveiller les éventuelles P3 lors du prochain relevé comparable.
        </div>
      ) : null}
    </section>
  );
}
