import PageHeader from "../components/PageHeader";
import PriorityBadge from "../components/PriorityBadge";

async function getDashboard() {
  const res = await fetch("http://backend:4000/dashboard", { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur chargement progression");
  return res.json();
}

export default async function ProgressPage() {
  const agencies = await getDashboard();
  const sorted = [...agencies].sort((a, b) => b.citationScore - a.citationScore);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Progression réseau"
          subtitle="Classement des agences selon leur score de citations locales."
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Rang</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Score</th>
                <th className="text-left p-4">OK</th>
                <th className="text-left p-4">Absents</th>
                <th className="text-left p-4">À corriger</th>
                <th className="text-left p-4">Priorité</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agency, index) => (
                <tr key={agency.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold">#{index + 1}</td>
                  <td className="p-4 font-semibold">{agency.name}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4 font-bold">{agency.citationScore}%</td>
                  <td className="p-4">{agency.directoriesOk} / {agency.directoriesTotal}</td>
                  <td className="p-4">{agency.directoriesMissing}</td>
                  <td className="p-4">{agency.directoriesToCorrect}</td>
                  <td className="p-4"><PriorityBadge priority={agency.priority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
