import MainLayout from "../components/MainLayout";

async function getReport() {
  try {
    const res = await fetch("http://backend:4000/seo-report/daily", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      ok: false,
      networkScore: 0,
      totalActions: 0,
      highActions: 0,
      top3: [],
      weakest: [],
      progressions: [],
      regressions: [],
      priorityActions: [],
      reportText: ""
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
  const report = await getReport();

  return (
    <MainLayout
      title="Rapport SEO quotidien"
      subtitle="Synthèse direction réseau Mondescale"
    >
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card label="Score réseau" value={`${report.networkScore}/100`} />
        <Card label="Actions ouvertes" value={report.totalActions} />
        <Card label="Prioritaires" value={report.highActions} />
        <Card label="Agences suivies" value={(report.top3 || []).length ? 9 : 0} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top agences</h2>
          <div className="space-y-3">
            {(report.top3 || []).map((agency, index) => (
              <div key={agency.id} className="flex justify-between border-b pb-2">
                <div>
                  <div className="font-semibold">{index + 1}. {agency.city}</div>
                  <div className="text-xs text-gray-500">{agency.name}</div>
                </div>
                <div className="font-bold">{agency.score}/100</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Agences à surveiller</h2>
          <div className="space-y-3">
            {(report.weakest || []).map((agency, index) => (
              <div key={agency.id} className="flex justify-between border-b pb-2">
                <div>
                  <div className="font-semibold">{index + 1}. {agency.city}</div>
                  <div className="text-xs text-gray-500">{agency.name}</div>
                </div>
                <div className="font-bold">{agency.score}/100</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Actions prioritaires</h2>

        <div className="space-y-4">
          {(report.priorityActions || []).map((action) => (
            <div key={action.id} className="border rounded-xl p-4">
              <div className="text-xs uppercase text-gray-500">
                {action.city} · {action.lever} · {action.status}
              </div>
              <div className="font-bold mt-1">{action.title}</div>
              <div className="text-sm text-gray-600 mt-2">{action.description}</div>
            </div>
          ))}

          {(!report.priorityActions || report.priorityActions.length === 0) && (
            <div className="text-gray-500">Aucune action prioritaire ouverte.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Texte du rapport</h2>
        <pre className="bg-slate-50 rounded-xl p-4 whitespace-pre-wrap text-sm">
          {report.reportText}
        </pre>
      </div>
    </MainLayout>
  );
}
