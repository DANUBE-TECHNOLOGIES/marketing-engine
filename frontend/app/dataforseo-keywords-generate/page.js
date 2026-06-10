import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import StatCard from "../components/StatCard";

async function getGenerated() {

  const res = await fetch(
    "http://backend:4000/dataforseo-keywords/generate",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Erreur génération keywords");
  }

  return res.json();
}

export default async function DataForSeoKeywordsGeneratePage() {

  await requireRole(["admin", "manager"]);

  const data = await getGenerated();

  const totalKeywords =
    data.rows.reduce(
      (sum, row) => sum + row.generatedKeywords.length,
      0
    );

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Génération mots-clés SEO"
          subtitle="Mots-clés locaux générés automatiquement."
          action={
            <div className="flex gap-2">

              <a
                href="http://localhost:4000/dataforseo-keywords/generate/export"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Export CSV
              </a>

              <ButtonLink href="/dataforseo-keywords">
                Keywords
              </ButtonLink>

              <ButtonLink href="/dataforseo-readiness">
                Readiness
              </ButtonLink>

            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          <StatCard
            label="Agences"
            value={data.total}
          />

          <StatCard
            label="Keywords générés"
            value={totalKeywords}
          />

        </div>

        <div className="space-y-4">

          {data.rows.map((agency) => (

            <div
              key={agency.code}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="mb-4">

                <div className="font-bold text-lg">
                  {agency.agencyName}
                </div>

                <div className="text-sm text-gray-500">
                  {agency.city}
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                {agency.generatedKeywords.map((keyword) => (

                  <span
                    key={keyword}
                    className="bg-gray-100 px-3 py-2 rounded-lg text-xs"
                  >
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
