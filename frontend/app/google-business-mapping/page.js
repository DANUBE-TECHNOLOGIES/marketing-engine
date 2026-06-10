import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getMapping() {
  const res = await fetch("http://backend:4000/google-business-mapping", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur mapping Google Business");

  return res.json();
}

export default async function GoogleBusinessMappingPage() {
  await requireRole(["admin", "manager"]);

  const data = await getMapping();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Mapping Google Business"
          subtitle="Préparation des établissements Google Business Profile à connecter."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/google-business-status">Statut Google</ButtonLink>
              <ButtonLink href="/google-business-readiness">Readiness</ButtonLink>
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences" value={data.total} />
          <StatCard label="Prêtes Google" value={data.ready} />
          <StatCard label="À mapper" value={data.missing} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Google Business ID</th>
                <th className="text-left p-4">Place ID</th>
                <th className="text-left p-4">Avis</th>
                <th className="text-left p-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.code} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{row.agencyName}</td>
                  <td className="p-4">{row.city}</td>
                  <td className="p-4">{row.googleBusinessId || "-"}</td>
                  <td className="p-4">{row.placeId || "-"}</td>
                  <td className="p-4">{row.reviewUrl ? "OK" : "Non"}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      row.ready ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {row.ready ? "Prêt" : "À compléter"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <div className="font-bold mb-3">À renseigner dans le référentiel</div>
          <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`googleBusinessId: "",
placeId: "",
googleConnected: false,`}
          </pre>
        </div>
      </div>
    </main>
  );
}
