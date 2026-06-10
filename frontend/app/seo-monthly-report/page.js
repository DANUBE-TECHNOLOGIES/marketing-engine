import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getReport() {
  const res = await fetch("http://backend:4000/seo-monthly-report?month=2026-06", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur rapport SEO mensuel");

  return res.json();
}

export default async function SeoMonthlyReportPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReport();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Rapport SEO mensuel"
          subtitle={`Synthèse SEO locale Mondescale — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-today">SEO Today</ButtonLink>
              <ButtonLink href="/seo-direction">SEO Direction</ButtonLink>
              <ButtonLink href="/seo-cluster-calendar-stats">Stats calendrier</ButtonLink>
              <ButtonLink href="/production">Production</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Posts SEO" value={data.summary.seoPostsTotal} />
          <StatCard label="Validés" value={data.summary.seoPostsValidated} />
          <StatCard label="Publiés" value={data.summary.seoPostsPublished} />
          <StatCard label="Planifiés" value={data.summary.seoPostsPlanned} />
          <StatCard label="Agences prêtes" value={data.summary.agenciesReady} />
          <StatCard label="Agences à compléter" value={data.summary.agenciesNotReady} />
          <StatCard label="DataForSEO readiness" value={`${data.summary.dataforseoAverage}%`} />
          <StatCard label="Actions prioritaires" value={data.summary.todayActions} />
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-4">Priorités du mois</div>

          <div className="space-y-3">
            {data.priorities.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between gap-3 mb-2">
                  <div className="font-semibold">{item.title}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.priority === "high"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{item.type}</div>
                <div className="text-sm mt-2">{item.detail}</div>
              </div>
            ))}

            {data.priorities.length === 0 && (
              <div className="text-sm text-gray-500">
                Aucune priorité critique pour ce mois.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
