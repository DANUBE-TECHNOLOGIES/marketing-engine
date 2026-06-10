import MainLayout from "../components/MainLayout";

async function getHistory() {
  try {
    const res = await fetch("http://backend:4000/seo-report/history", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getHistory();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Historique rapports SEO"
      subtitle="Archives quotidiennes du pilotage réseau"
    >
      <div className="bg-white rounded-2xl shadow p-5 mb-8">
        <div className="text-sm text-gray-500">Rapports archivés</div>
        <div className="text-3xl font-bold">{data.total}</div>
      </div>

      <div className="space-y-6">
        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Rapport du {new Date(row.reportDate).toLocaleDateString("fr-FR")}
                </h2>
                <div className="text-sm text-gray-500">
                  Score réseau : {row.networkScore}/100 · Actions : {row.totalActions} · Prioritaires : {row.highActions}
                </div>
              </div>
            </div>

            <pre className="bg-slate-50 rounded-xl p-4 whitespace-pre-wrap text-sm">
              {row.reportText}
            </pre>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6 text-gray-500">
            Aucun rapport archivé.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
