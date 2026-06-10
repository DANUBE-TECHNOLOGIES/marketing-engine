import MainLayout from "../components/MainLayout";
import ReviewEngineButtons from "./ReviewEngineButtons";

async function getDashboard() {
  try {
    const res = await fetch("http://backend:4000/review-engine/dashboard", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalAgencies: 0,
      high: 0,
      medium: 0,
      ok: 0,
      totalReviews30: 0,
      totalRequests30: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getDashboard();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Google Review Engine"
      subtitle="Pilotage automatique des demandes d’avis Google"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Agences</div>
          <div className="text-3xl font-bold">{data.totalAgencies}</div>
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

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Avis 30j</div>
          <div className="text-3xl font-bold">{data.totalReviews30}</div>
        </div>
      </div>

      <ReviewEngineButtons />

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Objectifs avis par agence
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Avis 30j</th>
                <th>Objectif</th>
                <th>Manque</th>
                <th>Demandes 30j</th>
                <th>Envoyées</th>
                <th>Priorité</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">{row.agencyName}</td>
                  <td>{row.city}</td>
                  <td>{row.reviews30}</td>
                  <td>{row.target}</td>
                  <td>{row.missing}</td>
                  <td>{row.requests30}</td>
                  <td>{row.sent30}</td>
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
