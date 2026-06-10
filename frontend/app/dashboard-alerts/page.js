import MainLayout from "../components/MainLayout";

async function getAlerts() {
  try {
    const res = await fetch("http://backend:4000/dashboard-alerts", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      high: 0,
      medium: 0,
      alerts: []
    };
  }
}

export default async function Page() {
  const data = await getAlerts();
  const alerts = data.alerts || [];

  return (
    <MainLayout
      title="Alertes réseau"
      subtitle="Alertes SEO, avis Google, posts et configuration agences"
    >
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Alertes totales</div>
          <div className="text-3xl font-bold">{data.total}</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Priorité haute</div>
          <div className="text-3xl font-bold">{data.high}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Priorité moyenne</div>
          <div className="text-3xl font-bold">{data.medium}</div>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune alerte.
          </div>
        )}

        {alerts.map((alert, index) => (
          <div
            key={`${alert.agencyId}-${alert.type}-${index}`}
            className={`rounded-2xl shadow p-6 ${
              alert.priority === "high" ? "bg-red-50" : "bg-white"
            }`}
          >
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {alert.city} · {alert.type}
                </div>

                <h2 className="text-xl font-bold">
                  {alert.agencyName}
                </h2>

                <p className="mt-2 text-gray-700">
                  {alert.message}
                </p>
              </div>

              <div className="text-right font-bold">
                {alert.priority === "high" ? "Haute" : "Moyenne"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
