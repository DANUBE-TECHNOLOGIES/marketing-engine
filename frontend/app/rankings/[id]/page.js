import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getAgencyRanking(id) {
  const res = await fetch(`http://backend:4000/rankings/${id}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement ranking agence");

  return res.json();
}

function trendLabel(trend) {
  if (trend === "up") return "Progression";
  if (trend === "down") return "À travailler";
  return "Stable";
}

function trendClass(trend) {
  if (trend === "up") return "bg-green-100 text-green-800";
  if (trend === "down") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default async function AgencyRankingPage({ params }) {
  const agency = await getAgencyRanking(params.id);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={`Positions locales — ${agency.city}`}
          subtitle={agency.agencyName}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/rankings">Tous rankings</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="text-sm text-gray-500">Position moyenne</div>
          <div className="text-4xl font-bold">#{agency.averagePosition}</div>
        </div>

        <div className="space-y-4">
          {agency.keywords.map((keyword) => (
            <div key={keyword.keyword} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-bold text-lg">{keyword.keyword}</div>
                  <div className="text-sm text-gray-500">Position locale simulée</div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold">#{keyword.position}</div>
                  <span className={`text-xs px-2 py-1 rounded ${trendClass(keyword.trend)}`}>
                    {trendLabel(keyword.trend)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
