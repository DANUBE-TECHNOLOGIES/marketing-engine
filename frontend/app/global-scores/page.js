import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getGlobalScores() {
  const res = await fetch("http://backend:4000/agency-global-scores-v2", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement scores globaux");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "Haute") return "bg-red-100 text-red-800";
  if (priority === "Moyenne") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function GlobalScoresPage() {
  await requireRole(["admin", "manager"]);

  const data = await getGlobalScores();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Scores globaux agences"
          subtitle="Score combiné : citations locales, Google Posts et demandes d’avis."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/direction">Direction</ButtonLink>
              <ButtonLink href="/system-health">Système</ButtonLink>
              <ButtonLink href="/global-actions">Actions globales</ButtonLink>
              <a href="http://localhost:4000/agency-global-scores-v2/export?month=2026-05" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Score moyen" value={`${data.averageGlobalScore}%`} />
          <StatCard label="Agences" value={data.totalAgencies} />
          <StatCard label="Priorité haute" value={data.highPriority} />
          <StatCard label="Priorité moyenne" value={data.mediumPriority} />
          <StatCard label="OK" value={data.ok} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Global</th>
                <th className="text-left p-4">Citations</th>
                <th className="text-left p-4">Posts</th>
                <th className="text-left p-4">Avis</th>
                <th className="text-left p-4">Ranking</th>
                <th className="text-left p-4">Position moy.</th>
                <th className="text-left p-4">Annuaires absents</th>
                <th className="text-left p-4">Avis restants</th>
                <th className="text-left p-4">Priorité</th>
              </tr>
            </thead>

            <tbody>
              {data.scores.map((agency) => (
                <tr key={agency.agencyId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{agency.agencyName}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4 font-bold">{agency.globalScore}%</td>
                  <td className="p-4">{agency.citationScore}%</td>
                  <td className="p-4">{agency.editorialScore}%</td>
                  <td className="p-4">{agency.reputationScore}%</td>
                  <td className="p-4">{agency.rankingScore}%</td>
                  <td className="p-4">#{agency.averagePosition}</td>
                  <td className="p-4">{agency.missingDirectories}</td>
                  <td className="p-4">{agency.reviewsRemaining}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${priorityClass(agency.priority)}`}>
                      {agency.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
