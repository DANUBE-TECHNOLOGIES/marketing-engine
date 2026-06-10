import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getReadiness() {
  const res = await fetch("http://backend:4000/dataforseo-readiness", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur readiness DataForSEO");

  return res.json();
}

export default async function DataForSeoReadinessPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReadiness();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="DataForSEO Readiness"
          subtitle="Préparation du suivi réel des positions locales, sans appel API."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/dataforseo">DataForSEO</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StatCard label="Agences" value={data.total} />
          <StatCard label="Readiness moyen" value={`${data.average}%`} />
        </div>

        <div className="space-y-4">
          {data.rows.map((agency) => (
            <div key={agency.code} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>
                <div className="bg-black text-white px-3 py-1 rounded text-sm h-fit">
                  {agency.score}%
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                {Object.entries(agency.checks).map(([key, ok]) => (
                  <div
                    key={key}
                    className={`rounded-lg p-3 ${
                      ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ok ? "✓" : "✕"} {key}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {agency.keywords.map((keyword) => (
                  <span key={keyword} className="bg-gray-100 px-3 py-2 rounded-lg text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
