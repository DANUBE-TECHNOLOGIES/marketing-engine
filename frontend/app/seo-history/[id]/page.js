import MainLayout from "../../components/MainLayout";

async function getHistory(id) {
  try {
    const res = await fetch(`http://backend:4000/seo-history/${id}`, {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      agencyName: "Agence",
      city: "",
      totalPoints: 0,
      currentScore: 0,
      evolution: 0,
      points: []
    };
  }
}

function evolutionLabel(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function evolutionClass(value) {
  if (value > 0) return "text-green-700 font-bold";
  if (value < 0) return "text-red-700 font-bold";
  return "text-gray-500";
}

export default async function Page({ params }) {
  const data = await getHistory(params.id);
  const points = data.points || [];

  const last = points[points.length - 1] || null;

  return (
    <MainLayout
      title="Historique SEO"
      subtitle={`${data.agencyName} ${data.city ? "· " + data.city : ""}`}
    >
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Score actuel</div>
          <div className="text-4xl font-bold">{data.currentScore}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Évolution</div>
          <div className={`text-4xl ${evolutionClass(Number(data.evolution || 0))}`}>
            {evolutionLabel(Number(data.evolution || 0))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Snapshots</div>
          <div className="text-4xl font-bold">{data.totalPoints}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Dernière mesure</div>
          <div className="text-lg font-bold">
            {last?.snapshotDate
              ? new Date(last.snapshotDate).toLocaleDateString("fr-FR")
              : "-"}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Dernier détail du score</h2>

        {last ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">SEO</div>
              <div className="text-3xl font-bold">{last.seoScore}</div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">Posts</div>
              <div className="text-3xl font-bold">{last.postScore}</div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">Avis</div>
              <div className="text-3xl font-bold">{last.reviewScore}</div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-sm text-gray-500">Citations</div>
              <div className="text-3xl font-bold">{last.citationScore}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Aucun historique disponible.</div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-6">Historique des mesures</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Date</th>
                <th>SEO</th>
                <th>Posts</th>
                <th>Avis</th>
                <th>Citations</th>
              </tr>
            </thead>

            <tbody>
              {points.map((point, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3">
                    {new Date(point.snapshotDate).toLocaleDateString("fr-FR")}
                  </td>
                  <td><strong>{point.seoScore}</strong></td>
                  <td>{point.postScore}</td>
                  <td>{point.reviewScore}</td>
                  <td>{point.citationScore}</td>
                </tr>
              ))}

              {points.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-gray-500">
                    Aucun snapshot disponible pour cette agence.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <a href="/seo-ranking" className="underline">
            Retour au classement réseau
          </a>
        </div>
      </div>
    </MainLayout>
  );
}
