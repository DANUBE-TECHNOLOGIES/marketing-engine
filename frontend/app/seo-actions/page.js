import MainLayout from "../components/MainLayout";
import SeoActionsButtons from "./SeoActionsButtons";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/seo-actions", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      open: 0,
      done: 0,
      high: 0,
      medium: 0,
      low: 0,
      actions: []
    };
  }
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default async function Page() {
  const data = await getData();
  const actions = data.actions || [];

  return (
    <MainLayout
      title="SEO Actions"
      subtitle="Centre d’actions priorisées pour le réseau Mondescale"
    >
      <div className="grid grid-cols-6 gap-4 mb-8">
        <Card label="Total" value={data.total} />
        <Card label="Ouvertes" value={data.open} />
        <Card label="Terminées" value={data.done} />
        <Card label="HIGH" value={data.high} />
        <Card label="MEDIUM" value={data.medium} />
        <Card label="LOW" value={data.low} />
      </div>

      <SeoActionsButtons />

      <div className="space-y-4">
        {actions.map((action) => (
          <div key={action.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {action.priority} · {action.lever} · {action.status}
                </div>

                <h2 className="text-xl font-bold">
                  {action.title}
                </h2>

                <p className="text-gray-600 mt-1">
                  {action.city} · {action.agencyName}
                </p>
              </div>

              <div className="text-right text-sm">
                <div>Responsable : {action.owner || "Sylvie"}</div>
                <div>Gain estimé : +{action.estimatedGain} SEO</div>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm">
              {action.description}
            </div>

            {action.status !== "done" && (
              <form action={`/api/seo-actions/${action.id}/done`} method="POST" className="mt-4">
                <button className="px-4 py-2 rounded-xl bg-green-100">
                  Marquer terminé
                </button>
              </form>
            )}
          </div>
        ))}

        {actions.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune action SEO.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
