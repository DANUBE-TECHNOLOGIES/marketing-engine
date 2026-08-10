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

async function loadLaunchNetwork() {
  const response = await fetch(
    `${backendOrigin()}/api/agency-launch/network`,
    {
      headers: {
        Accept: "application/json",
        "x-tenant-slug":
          process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Agency launch HTTP ${response.status}: ${message}`
    );
  }

  return response.json();
}

function stateClasses(code) {
  switch (code) {
    case "online":
      return "bg-emerald-100 text-emerald-800";
    case "ready_to_publish":
      return "bg-cyan-100 text-cyan-900";
    case "to_complete":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default async function AgencyLaunchPage() {
  let payload = null;
  let error = null;

  try {
    payload = await loadLaunchNetwork();
  } catch (loadError) {
    error = loadError;
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const summary = payload?.summary || {};

  return (
    <MainLayout
      title="Mise en ligne des mini-sites"
      subtitle="Cockpit de préparation des sites agences avant indexation Google."
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          Impossible de charger l’état de lancement : {error.message}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard label="Agences" value={summary.total || 0} />
            <SummaryCard label="À préparer" value={summary.toPrepare || 0} />
            <SummaryCard label="À compléter" value={summary.toComplete || 0} />
            <SummaryCard
              label="Prêtes à publier"
              value={summary.readyToPublish || 0}
            />
            <SummaryCard label="En ligne" value={summary.online || 0} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                État des agences
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Une agence est prête quand son identité, ses pages générales,
                ses informations légales et son SEO de base sont complets.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const agency = item.agency || {};
                const site = item.site || null;
                const readiness = item.readiness || {};
                const state = item.launchState || {};
                const blockers = Array.isArray(readiness.blockers)
                  ? readiness.blockers
                  : [];

                return (
                  <div
                    key={agency.id}
                    className="grid gap-4 px-6 py-5 lg:grid-cols-[1.4fr_0.7fr_1.3fr_auto] lg:items-center"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {agency.name || `Agence #${agency.id}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {agency.city || "Ville non renseignée"}
                      </div>
                      {site?.slug ? (
                        <div className="mt-1 text-xs text-slate-400">
                          /agence/{site.slug}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stateClasses(
                          state.code
                        )}`}
                      >
                        {state.label || "À préparer"}
                      </span>
                      <div className="mt-2 text-sm text-slate-500">
                        Score : {Number(readiness.score || 0)} / 100
                      </div>
                    </div>

                    <div>
                      {blockers.length ? (
                        <div className="flex flex-wrap gap-2">
                          {blockers.map((blocker) => (
                            <span
                              key={blocker.code}
                              className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                            >
                              {blocker.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-emerald-700">
                          Aucun blocage obligatoire
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={`/website-builder?agencyId=${agency.id}`}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                      >
                        Ouvrir le Designer
                      </Link>

                      {site?.slug ? (
                        <Link
                          href={`/agence/${site.slug}`}
                          target="_blank"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Voir le site
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {!items.length ? (
                <div className="px-6 py-10 text-center text-slate-500">
                  Aucune agence disponible pour ce tenant.
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
