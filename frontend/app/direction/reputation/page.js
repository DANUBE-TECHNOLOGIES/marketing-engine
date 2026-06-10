import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ButtonLink from "../../components/ButtonLink";

async function getReputation() {
  const res = await fetch("http://backend:4000/direction/reputation", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement réputation direction");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "Haute") return "bg-red-100 text-red-800";
  if (priority === "Moyenne") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function DirectionReputationPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReputation();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Direction — Réputation"
          subtitle="Suivi réseau des demandes d’avis Google."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/review-requests/actions">Actions avis</ButtonLink>
              <ButtonLink href="/direction">Direction</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Demandes envoyées" value={data.totalSent} />
          <StatCard label="Reste à envoyer" value={data.totalRemaining} />
          <StatCard label="Agences OK" value={`${data.agenciesOk}/${data.totalAgencies}`} />
          <StatCard label="Objectif / agence" value={data.monthlyTarget} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Envoyées</th>
                <th className="text-left p-4">Brouillons</th>
                <th className="text-left p-4">Reste</th>
                <th className="text-left p-4">Progression</th>
                <th className="text-left p-4">Priorité</th>
              </tr>
            </thead>

            <tbody>
              {data.rows.map((agency) => (
                <tr key={agency.agencyId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{agency.agencyName}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4 font-bold">{agency.sent}</td>
                  <td className="p-4">{agency.drafts}</td>
                  <td className="p-4">{agency.remaining}</td>
                  <td className="p-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-900 h-2 rounded-full"
                        style={{ width: `${agency.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{agency.progress}%</div>
                  </td>
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
