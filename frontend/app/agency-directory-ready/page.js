import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getReady() {
  const res = await fetch("http://backend:4000/agency-directory/ready", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur readiness agences");

  return res.json();
}

export default async function AgencyDirectoryReadyPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReady();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Agences prêtes à exploiter"
          subtitle="Contrôle des agences prêtes pour Google Posts, demandes d’avis et contenus locaux."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
              <ButtonLink href="/agency-directory-missing">Données manquantes</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences" value={data.total} />
          <StatCard label="Prêtes" value={data.ready} />
          <StatCard label="À compléter" value={data.notReady} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Statut</th>
                <th className="text-left p-4">Avis</th>
                <th className="text-left p-4">Posts</th>
                <th className="text-left p-4">Manquants</th>
              </tr>
            </thead>

            <tbody>
              {data.rows.map((agency) => (
                <tr key={agency.code} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{agency.agencyName}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      agency.ready
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {agency.ready ? "Prête" : "À compléter"}
                    </span>
                  </td>
                  <td className="p-4">{agency.canGenerateReviews ? "OK" : "Non"}</td>
                  <td className="p-4">{agency.canGeneratePosts ? "OK" : "Non"}</td>
                  <td className="p-4">{agency.missing.length ? agency.missing.join(", ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
