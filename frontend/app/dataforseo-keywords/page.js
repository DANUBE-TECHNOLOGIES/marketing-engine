import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getKeywords() {
  const res = await fetch("http://backend:4000/dataforseo-keywords", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur mots-clés DataForSEO");

  return res.json();
}

export default async function DataForSeoKeywordsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getKeywords();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Mots-clés DataForSEO"
          subtitle="Préparation des mots-clés de suivi local par agence."
          action={
            <div className="flex gap-2">
              <a
                href="http://localhost:4000/dataforseo-keywords/export"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Export CSV
              </a>
              <ButtonLink href="/dataforseo-readiness">Readiness</ButtonLink>
              <ButtonLink href="/dataforseo-locations">Localisations</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences" value={data.total} />
          <StatCard label="Prêtes" value={data.ready} />
          <StatCard label="Sans mots-clés" value={data.missing} />
        </div>

        <div className="space-y-4">
          {data.rows.map((agency) => (
            <div key={agency.code} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <span className={`text-xs px-2 py-1 rounded h-fit ${
                  agency.ready ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {agency.count} mot(s)-clé(s)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {agency.keywords.map((keyword) => (
                  <span key={keyword} className="bg-gray-100 px-3 py-2 rounded-lg text-xs">
                    {keyword}
                  </span>
                ))}

                {agency.keywords.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Aucun mot-clé configuré.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
