import MainLayout from "../components/MainLayout";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/seo-ranking", {
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

function evolutionLabel(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function evolutionClass(value) {
  if (value > 0) return "text-green-700 font-bold";
  if (value < 0) return "text-red-700 font-bold";
  return "text-gray-500";
}

function rankIcon(index) {
  if (index === 0) return "🏆";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return index + 1;
}

export default async function Page() {
  const data = await getData();
  const rows = data.rows || [];

  const topProgressions = [...rows]
    .filter((row) => Number(row.evolution || 0) > 0)
    .sort((a, b) => Number(b.evolution || 0) - Number(a.evolution || 0))
    .slice(0, 3);

  const regressions = [...rows]
    .filter((row) => Number(row.evolution || 0) < 0)
    .sort((a, b) => Number(a.evolution || 0) - Number(b.evolution || 0))
    .slice(0, 3);

  const networkScore = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length)
    : 0;

  return (
    <MainLayout
      title="SEO Ranking"
      subtitle="Classement réseau Mondescale et évolution des agences"
    >
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Score réseau</div>
          <div className="text-4xl font-bold">{networkScore}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Agences suivies</div>
          <div className="text-4xl font-bold">{rows.length}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Progressions</div>
          <div className="text-4xl font-bold">{topProgressions.length}</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Régressions</div>
          <div className="text-4xl font-bold">{regressions.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top progressions</h2>

          <div className="space-y-3">
            {topProgressions.map((row, index) => (
              <div key={row.id} className="flex justify-between border-b pb-2">
                <div>
                  <div className="font-semibold">
                    {index + 1}. {row.name}
                  </div>
                  <div className="text-xs text-gray-500">{row.city}</div>
                </div>

                <div className="text-green-700 font-bold">
                  +{row.evolution}
                </div>
              </div>
            ))}

            {topProgressions.length === 0 && (
              <div className="text-gray-500 text-sm">
                Aucune progression détectée pour le moment.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Régressions à surveiller</h2>

          <div className="space-y-3">
            {regressions.map((row, index) => (
              <div key={row.id} className="flex justify-between border-b pb-2">
                <div>
                  <div className="font-semibold">
                    {index + 1}. {row.name}
                  </div>
                  <div className="text-xs text-gray-500">{row.city}</div>
                </div>

                <div className="text-red-700 font-bold">
                  {row.evolution}
                </div>
              </div>
            ))}

            {regressions.length === 0 && (
              <div className="text-gray-500 text-sm">
                Aucune régression détectée.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-6">Classement SEO Réseau</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3">Rang</th>
                <th>Agence</th>
                <th>Ville</th>
                <th>SEO</th>
                <th>Posts</th>
                <th>Avis</th>
                <th>Citations</th>
                <th>30 jours</th>
                <th>Historique</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 text-lg">
                    {rankIcon(index)}
                  </td>

                  <td className="font-semibold">
                    {row.name}
                  </td>

                  <td>
                    {row.city}
                  </td>

                  <td>
                    <strong>{row.score}</strong>
                  </td>

                  <td>
                    {row.postScore}
                  </td>

                  <td>
                    {row.reviewScore}
                  </td>

                  <td>
                    {row.citationScore}
                  </td>

                  <td className={evolutionClass(Number(row.evolution || 0))}>
                    {evolutionLabel(Number(row.evolution || 0))}
                  </td>

                  <td>
                    <a
                      href={`/seo-history/${row.id}`}
                      className="underline"
                    >
                      Voir
                    </a>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-6 text-gray-500">
                    Aucun classement disponible. Lance un snapshot SEO.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
