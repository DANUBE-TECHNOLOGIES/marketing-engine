import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getDirectories() {
  const res = await fetch("http://backend:4000/directories", { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur chargement annuaires");
  return res.json();
}

export default async function DirectoriesPage() {
  const directories = await getDirectories();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Annuaires"
          subtitle="Référentiel des annuaires locaux et citations SEO suivis."
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={directories.length} />
          <StatCard label="Priorité 1" value={directories.filter((d) => d.priority === 1).length} />
          <StatCard label="Impact 5/5" value={directories.filter((d) => d.impactScore === 5).length} />
          <StatCard label="Tourisme" value={directories.filter((d) => d.category === "tourisme").length} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Annuaire</th>
                <th className="text-left p-4">Catégorie</th>
                <th className="text-left p-4">Impact</th>
                <th className="text-left p-4">Difficulté</th>
                <th className="text-left p-4">Priorité</th>
                <th className="text-left p-4">Site</th>
              </tr>
            </thead>
            <tbody>
              {directories.map((directory) => (
                <tr key={directory.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{directory.name}</td>
                  <td className="p-4">{directory.category}</td>
                  <td className="p-4">{directory.impactScore}/5</td>
                  <td className="p-4">{directory.difficulty}/5</td>
                  <td className="p-4">{directory.priority}</td>
                  <td className="p-4">
                    <ButtonLink href={directory.website} variant="light">
                      Ouvrir
                    </ButtonLink>
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
