import MainLayout from "../components/MainLayout";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/directories/dashboard", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalAgencies: 0,
      averageScore: 0,
      high: 0,
      medium: 0,
      ok: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getData();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Citations Local SEO"
      subtitle="Score annuaires, cohérence NAP et visibilité locale"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Agences</div>
          <div className="text-3xl font-bold">{data.totalAgencies}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Score moyen</div>
          <div className="text-3xl font-bold">{data.averageScore}/100</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Priorité haute</div>
          <div className="text-3xl font-bold">{data.high}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Priorité moyenne</div>
          <div className="text-3xl font-bold">{data.medium}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">OK</div>
          <div className="text-3xl font-bold">{data.ok}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">État des citations par agence</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Score</th>
                <th>Total</th>
                <th>Validées</th>
                <th>Manquantes</th>
                <th>En attente</th>
                <th>Erreurs</th>
                <th>Priorité</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">{row.agencyName}</td>
                  <td>{row.city}</td>
                  <td>{row.score}/100</td>
                  <td>{row.total}</td>
                  <td>{row.validated}</td>
                  <td>{row.missing}</td>
                  <td>{row.pending}</td>
                  <td>{row.error}</td>
                  <td>{row.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
