import Link from "next/link";
import MainLayout from "../components/MainLayout";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(
    process.env.BACKEND_INTERNAL_URL ||
      process.env.API_INTERNAL_URL ||
      "http://backend:4000"
  ).replace(/\/+$/g, "");
}

async function loadSeoCockpit() {
  const response = await fetch(`${backendOrigin()}/api/agency-launch/network`, {
    headers: {
      Accept: "application/json",
      "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`SEO cockpit HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function Card({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function priorityClasses(priority) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  if (priority === "medium") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function confidenceLabel(confidence) {
  if (confidence === "medium") return "Confiance moyenne";
  if (confidence === "low") return "Confiance faible";
  return "Données insuffisantes";
}

export default async function SeoCockpitPage() {
  let payload = null;
  let error = null;
  try {
    payload = await loadSeoCockpit();
  } catch (loadError) {
    error = loadError;
  }

  const priorities = payload?.seoPriorities || {};
  const learning = payload?.seoLearning || {};
  const actions = Array.isArray(priorities.actions) ? priorities.actions : [];

  return (
    <MainLayout
      title="Cockpit SEO réseau"
      subtitle="Priorités locales, score explicable et apprentissage observé sur les mini-sites Mondescale."
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          Impossible de charger le cockpit SEO : {error.message}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card label="Actions détectées" value={priorities.total || 0} />
            <Card label="Priorité haute" value={priorities.highPriority || 0} />
            <Card label="Agences concernées" value={priorities.agenciesWithActions || 0} />
            <Card label="Actions mesurées" value={learning.measuredActions || 0} />
            <Card
              label="Apprentissage actif"
              value={priorities.learningApplied ? "Oui" : "Non"}
              hint="Seulement avec un échantillon suffisamment crédible."
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Actions SEO prioritaires</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Le score final reste auditable : priorité métier + valeur du signal + bonus d’apprentissage plafonné.
                </p>
              </div>
              <Link href="/agency-launch" className="text-sm font-semibold text-cyan-800 hover:underline">
                Voir la mise en ligne des mini-sites
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {actions.map((action, index) => {
                const score = action.score || {};
                const actionLearning = action.learning || {};
                return (
                  <article key={`${action.agency?.id || "network"}-${action.code}-${index}`} className="px-6 py-5">
                    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr_0.9fr] xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${priorityClasses(action.priority)}`}>
                            {action.priority || "low"}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {action.agency?.name || `Agence #${action.agency?.id || "?"}`}
                            {action.agency?.city ? ` · ${action.agency.city}` : ""}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-slate-950">{action.title}</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{action.detail}</p>
                        {action.targetPage?.slug ? (
                          <div className="mt-3 text-xs font-medium text-slate-500">
                            Page cible : /{action.targetPage.slug}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score explicable</div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-slate-500">Priorité</span><div className="font-bold text-slate-900">{score.priority ?? 0}</div></div>
                          <div><span className="text-slate-500">Signal</span><div className="font-bold text-slate-900">{score.source ?? 0}</div></div>
                          <div><span className="text-slate-500">Socle</span><div className="font-bold text-slate-900">{score.base ?? 0}</div></div>
                          <div><span className="text-slate-500">Learning</span><div className="font-bold text-slate-900">+{score.learning ?? 0}</div></div>
                        </div>
                        <div className="mt-4 border-t border-slate-200 pt-3">
                          <span className="text-xs text-slate-500">Score final</span>
                          <div className="text-2xl font-black text-slate-950">{score.final ?? action.opportunityScore ?? 0}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apprentissage réseau</div>
                        <div className="mt-3 font-semibold text-slate-900">{confidenceLabel(actionLearning.confidence)}</div>
                        <div className="mt-2 text-sm text-slate-600">{actionLearning.samples || 0} cas mesurés</div>
                        {actionLearning.samples ? (
                          <div className="mt-2 text-sm text-slate-600">
                            Amélioration observée : {Math.round(Number(actionLearning.improvementRate || 0) * 100)} % · gain moyen {Number(actionLearning.averageDelta || 0).toFixed(1)} positions
                          </div>
                        ) : null}
                        <div className="mt-3 text-xs font-medium text-slate-500">
                          {actionLearning.applied
                            ? `Bonus appliqué : +${Number(actionLearning.bonus || 0).toFixed(1)}`
                            : "Aucun bonus appliqué à cette priorité."}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!actions.length ? (
                <div className="px-6 py-12 text-center text-slate-500">
                  Aucune action SEO prioritaire détectée actuellement.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm text-cyan-950">
            Les gains affichés sont des évolutions observées après des actions SEO. Ils servent au pilotage et ne constituent pas une preuve de causalité avec le classement Google.
          </div>
        </>
      )}
    </MainLayout>
  );
}
