import MainLayout from "../components/MainLayout";

async function getReviewActions() {
  try {
    const res = await fetch("http://backend:4000/network-actions", {
      cache: "no-store"
    });

    const data = await res.json();

    return {
      ...data,
      actions: (data.actions || []).filter((action) => action.lever === "reviews")
    };
  } catch {
    return {
      total: 0,
      actions: []
    };
  }
}

export default async function Page() {
  const data = await getReviewActions();
  const actions = data.actions || [];

  return (
    <MainLayout
      title="Actions Avis Google"
      subtitle="Suivi des agences qui doivent obtenir davantage d’avis Google"
    >
      <div className="bg-white rounded-2xl shadow p-5 mb-8">
        <div className="text-sm text-gray-500">Actions avis ouvertes / suivies</div>
        <div className="text-3xl font-bold">{actions.length}</div>
      </div>

      <div className="space-y-4">
        {actions.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune action avis Google.
          </div>
        )}

        {actions.map((action) => (
          <div key={action.id} className="bg-white rounded-2xl shadow p-6">
            <div className="text-xs uppercase text-gray-500 mb-1">
              {action.agency?.city || "Réseau"} · {action.status}
            </div>

            <h2 className="text-xl font-bold">
              {action.title}
            </h2>

            <p className="mt-2 text-gray-700">
              {action.description}
            </p>

            <div className="mt-4 flex gap-3 flex-wrap text-sm">
              <span className="px-3 py-1 rounded-full bg-slate-100">
                Responsable : {action.owner || "Non assigné"}
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-100">
                Agence : {action.agency?.name || "Réseau"}
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-100">
                Échéance : {action.deadline ? new Date(action.deadline).toLocaleDateString("fr-FR") : "Non définie"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
