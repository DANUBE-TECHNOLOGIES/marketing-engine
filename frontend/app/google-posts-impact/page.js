import MainLayout from "../components/MainLayout";

async function getImpact() {
  try {
    const res = await fetch("http://backend:4000/google-posts/impact", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      averageGain: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getImpact();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Impact Google Posts"
      subtitle="Mesure des effets SEO avant / après publication"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Mesures</div>
          <div className="text-3xl font-bold">{data.total}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Progressions</div>
          <div className="text-3xl font-bold">{data.positive}</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Régressions</div>
          <div className="text-3xl font-bold">{data.negative}</div>
        </div>

        <div className="bg-slate-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Neutres</div>
          <div className="text-3xl font-bold">{data.neutral}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Gain moyen</div>
          <div className="text-3xl font-bold">{data.averageGain}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Historique d’impact
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Mot-clé</th>
                <th>Avant</th>
                <th>Après</th>
                <th>Gain</th>
                <th>Post</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 font-semibold">{row.agencyName}</td>
                  <td>{row.city}</td>
                  <td>{row.keyword}</td>
                  <td>#{row.positionBefore}</td>
                  <td>#{row.positionAfter}</td>
                  <td className={Number(row.gain) > 0 ? "font-bold" : ""}>
                    {Number(row.gain) > 0 ? "+" : ""}{row.gain}
                  </td>
                  <td>{row.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
