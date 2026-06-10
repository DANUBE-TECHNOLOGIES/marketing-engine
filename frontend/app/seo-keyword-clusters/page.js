import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getClusters() {

  const res = await fetch(
    "http://backend:4000/seo-keyword-clusters",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Erreur clusters SEO");
  }

  return res.json();
}

export default async function SeoKeywordClustersPage() {

  await requireRole(["admin", "manager"]);

  const data = await getClusters();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Clusters SEO locaux"
          subtitle="Organisation intelligente des mots-clés par intention."
          action={
            <div className="flex gap-2">

              <a
                href="http://localhost:4000/seo-keyword-clusters/export"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Export CSV
              </a>

              <ButtonLink href="/dataforseo-keywords-generate">
                Keywords IA
              </ButtonLink>

              <ButtonLink href="/dataforseo-readiness">
                Readiness
              </ButtonLink>

            </div>
          }
        />

        <div className="space-y-6">

          {data.rows.map((agency) => (

            <div
              key={agency.code}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="mb-6">

                <div className="font-bold text-xl">
                  {agency.agencyName}
                </div>

                <div className="text-sm text-gray-500">
                  {agency.city}
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {Object.entries(agency.clusters).map(([cluster, keywords]) => (

                  <div
                    key={cluster}
                    className="border rounded-xl p-4"
                  >

                    <div className="font-bold capitalize mb-3">
                      {cluster}
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {keywords.map((keyword) => (

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

          ))}

        </div>

      </div>

    </main>
  );
}
