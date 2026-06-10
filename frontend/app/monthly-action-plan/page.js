import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getPlan() {
  const res = await fetch("http://backend:4000/monthly-action-plan", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur plan d’action mensuel");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function MonthlyActionPlanPage() {
  await requireRole(["admin", "manager"]);

  const data = await getPlan();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Plan d’action mensuel"
          subtitle={`Feuille de route SEO local par agence — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-ai-center">Centre IA SEO</ButtonLink>
              <ButtonLink href="/monthly-report">Rapport</ButtonLink>
              <a href="http://localhost:4000/monthly-action-plan/export?month=2026-05" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences concernées" value={data.totalAgencies} />
          <StatCard label="Actions totales" value={data.totalActions} />
          <StatCard label="Mois" value={data.month} />
        </div>

        <div className="space-y-6">
          {data.agencies.map((agency) => (
            <div key={agency.agencyId} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-xl">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <div className="text-sm bg-gray-900 text-white px-3 py-2 rounded-lg">
                  {agency.totalActions} action(s)
                </div>
              </div>

              <div className="space-y-3">
                {agency.actions.map((action, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex flex-wrap justify-between gap-3 mb-2">
                      <div className="font-semibold">{action.title}</div>
                      <span className={`text-xs px-2 py-1 rounded ${priorityClass(action.priority)}`}>
                        {action.priority}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      {action.recommendation}
                    </div>

                    <div className="text-xs text-blue-700 font-semibold mb-3">
                      Impact : {action.impact}
                    </div>

                    <ButtonLink href={action.link}>Traiter</ButtonLink>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {data.agencies.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Aucun plan d’action nécessaire pour le moment.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
