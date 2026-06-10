import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getRankings() {
  const res = await fetch("http://backend:4000/rankings", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement rankings");

  return res.json();
}

function trendBadge(trend) {
  if (trend === "up") {
    return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">↑</span>;
  }

  if (trend === "down") {
    return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">↓</span>;
  }

  return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">→</span>;
}

export default async function RankingsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getRankings();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Positions locales"
          subtitle="Suivi des mots-clés SEO locaux du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/global-scores">Scores globaux</ButtonLink>
              <ButtonLink href="/direction">Direction</ButtonLink>
              <a href="http://localhost:4000/rankings/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="space-y-6">
          {data.rankings.map((agency) => (
            <div key={agency.agencyId} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <div className="flex gap-2 items-center">
                  <ButtonLink href={`/rankings/${agency.agencyId}`}>Voir détail ranking</ButtonLink>
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
                  Position moyenne : {agency.averagePosition}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agency.keywords.map((keyword) => (
                  <div key={keyword.keyword} className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">
                        {keyword.keyword}
                      </div>

                      {trendBadge(keyword.trend)}
                    </div>

                    <div className="text-2xl font-bold">
                      #{keyword.position}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
