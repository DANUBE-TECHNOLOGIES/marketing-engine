import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getReport() {
  const res = await fetch("http://backend:4000/monthly-report", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement rapport mensuel");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "Haute" || priority === "high") return "bg-red-100 text-red-800";
  if (priority === "Moyenne" || priority === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function MonthlyReportPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReport();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Rapport mensuel Direction"
          subtitle={`Synthèse SEO local réseau — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/global-scores">Scores</ButtonLink>
              <ButtonLink href="/global-actions">Actions</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Score global moyen" value={`${data.summary.averageGlobalScore}%`} />
          <StatCard label="Agences prioritaires" value={data.summary.highPriorityAgencies} />
          <StatCard label="Actions à traiter" value={data.summary.totalActions} />
          <StatCard label="Mots-clés suivis" value={data.summary.trackedKeywords} />
          <StatCard label="Posts prévus" value={data.summary.totalPosts} />
          <StatCard label="Posts publiés" value={data.summary.publishedPosts} />
          <StatCard label="Avis demandés" value={data.summary.reviewsSent} />
          <StatCard label="Avis restants" value={data.summary.reviewsRemaining} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Agences les plus faibles</div>

            <div className="space-y-3">
              {data.weakestAgencies.map((agency) => (
                <div key={agency.agencyId} className="border rounded-lg p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-semibold">{agency.agencyName}</div>
                      <div className="text-sm text-gray-500">{agency.city}</div>
                    </div>
                    <div className="font-bold">{agency.globalScore}%</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Citations {agency.citationScore}% · Posts {agency.editorialScore}% · Avis {agency.reputationScore}% · Ranking {agency.rankingScore}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Actions prioritaires</div>

            <div className="space-y-3">
              {data.priorityActions.map((action, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between gap-3 mb-2">
                    <div className="font-semibold">{action.title}</div>
                    <span className={`text-xs px-2 py-1 rounded ${priorityClass(action.priority)}`}>
                      {action.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">{action.agencyName} — {action.city}</div>
                  <div className="text-sm mt-2">{action.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <div className="font-bold mb-2">Lecture Direction</div>
          <div className="text-sm text-gray-700">
            Ce rapport permet d’identifier rapidement les agences à traiter en priorité,
            les leviers SEO les plus faibles et les actions opérationnelles du mois.
          </div>
        </div>
      </div>
    </main>
  );
}
