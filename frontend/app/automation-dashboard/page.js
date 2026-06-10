import MainLayout from "../components/MainLayout";
import AutomationButtons from "./AutomationButtons";

async function getStatus() {
  try {
    const res = await fetch("http://backend:4000/automation/status", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalRecent: 0,
      open: 0,
      done: 0,
      reviews: 0,
      citations: 0,
      googlePosts: 0,
      seoRegression: 0,
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
  const data = await getStatus();
  const actions = data.actions || [];

  return (
    <MainLayout
      title="Automatisation quotidienne"
      subtitle="Génération automatique des actions SEO réseau"
    >
      <div className="grid grid-cols-6 gap-4 mb-8">
        <Card label="Actions ouvertes" value={data.open} />
        <Card label="Terminées" value={data.done} />
        <Card label="Avis" value={data.reviews} />
        <Card label="Citations" value={data.citations} />
        <Card label="Google Posts" value={data.googlePosts} />
        <Card label="Régressions SEO" value={data.seoRegression} />
      </div>

      <AutomationButtons />

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Dernières actions générées
        </h2>

        <div className="space-y-4">
          {actions.slice(0, 30).map((action) => (
            <div key={action.id} className="border rounded-xl p-4">
              <div className="text-xs uppercase text-gray-500">
                {action.city} · {action.lever} · {action.status}
              </div>

              <div className="font-bold mt-1">
                {action.title}
              </div>

              <div className="text-sm text-gray-600 mt-2">
                {action.description}
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Responsable : {action.owner || "Sylvie"}
              </div>
            </div>
          ))}

          {actions.length === 0 && (
            <div className="text-gray-500">
              Aucune action générée.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
