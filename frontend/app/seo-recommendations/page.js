import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getRecommendations(month) {
  const res = await fetch(`http://backend:4000/seo-recommendations?month=${month}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur recommandations SEO");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function RecommendationsPage({ searchParams }) {
  const month = searchParams?.month || "2026-05";
  const data = await getRecommendations(month);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Recommandations SEO IA"
          subtitle={`Analyse automatique du réseau — ${month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/direction">
                Direction
              </ButtonLink>

              <ButtonLink href="/">
                Dashboard
              </ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Recommandations</div>
            <div className="text-3xl font-bold">
              {data.totalRecommendations}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Critiques</div>
            <div className="text-3xl font-bold">
              {data.critical}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Hautes</div>
            <div className="text-3xl font-bold">
              {data.high}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Moyennes</div>
            <div className="text-3xl font-bold">
              {data.medium}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {data.recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow p-5 border"
            >
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">
                    {rec.agency}
                  </div>

                  <div className="text-sm text-gray-500">
                    {rec.city}
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(rec.priority)}`}>
                  {rec.priority}
                </span>
              </div>

              <div className="font-semibold mb-2">
                {rec.title}
              </div>

              <div className="text-sm text-gray-700 mb-3">
                {rec.description}
              </div>

              <div className="bg-gray-100 rounded-lg p-3 text-sm">
                <strong>Action recommandée :</strong><br />
                {rec.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
