import MainLayout from "../components/MainLayout";
import ReviewNetworkButtons from "./ReviewNetworkButtons";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/review-network", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalAgencies: 0,
      totalReviews30: 0,
      totalRequests30: 0,
      totalSent30: 0,
      totalReviewed30: 0,
      high: 0,
      medium: 0,
      ok: 0,
      top3: [],
      bottom3: [],
      rows: []
    };
  }
}

function Card({label,value}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default async function Page() {
  const data = await getData();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Réseau Avis Google"
      subtitle="Pilotage des avis, demandes et conversions par agence"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <Card label="Agences" value={data.totalAgencies} />
        <Card label="Avis 30j" value={data.totalReviews30} />
        <Card label="Demandes 30j" value={data.totalRequests30} />
        <Card label="Envoyées 30j" value={data.totalSent30} />
        <Card label="Avis obtenus" value={data.totalReviewed30} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
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

      <ReviewNetworkButtons />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top agences avis</h2>
          <div className="space-y-3">
            {(data.top3 || []).map((row,index)=>(
              <div key={row.agencyId} className="border rounded-xl p-3">
                <div className="font-bold">#{index+1} {row.city}</div>
                <div className="text-sm text-gray-600">{row.agencyName}</div>
                <div className="text-sm">Avis 30j : {row.reviews30}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Agences à relancer</h2>
          <div className="space-y-3">
            {(data.bottom3 || []).map((row,index)=>(
              <div key={row.agencyId} className="border rounded-xl p-3">
                <div className="font-bold">#{index+1} {row.city}</div>
                <div className="text-sm text-gray-600">{row.agencyName}</div>
                <div className="text-sm">Manque : {row.gap} avis</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Détail réseau</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Avis 30j</th>
                <th>Objectif</th>
                <th>Écart</th>
                <th>Demandes</th>
                <th>Envoyées</th>
                <th>Obtenus</th>
                <th>Conversion</th>
                <th>Priorité</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row=>(
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">{row.agencyName}</td>
                  <td>{row.city}</td>
                  <td>{row.reviews30}</td>
                  <td>{row.target}</td>
                  <td>{row.gap}</td>
                  <td>{row.requests30}</td>
                  <td>{row.sent30}</td>
                  <td>{row.reviewed30}</td>
                  <td>{row.conversion}%</td>
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
