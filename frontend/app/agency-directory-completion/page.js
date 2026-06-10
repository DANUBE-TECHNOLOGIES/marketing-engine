import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getCompletion() {
  const res = await fetch("http://backend:4000/agency-directory/completion", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur complétion référentiel");

  return res.json();
}

export default async function AgencyDirectoryCompletionPage() {
  await requireRole(["admin", "manager"]);

  const data = await getCompletion();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Complétion référentiel agences"
          subtitle="Liste des agences attendues dans le référentiel central."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
              <ButtonLink href="/agency-directory-quality">Qualité</ButtonLink>
              <a href="http://localhost:4000/agency-directory/completion/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences attendues" value={data.expected} />
          <StatCard label="Présentes" value={data.existing} />
          <StatCard label="Manquantes" value={data.missing} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Présente</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Champs manquants</th>
              </tr>
            </thead>

            <tbody>
              {data.rows.map((row) => (
                <tr key={row.code} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{row.code}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      row.exists
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {row.exists ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="p-4">{row.agencyName || "-"}</td>
                  <td className="p-4">{row.city || "-"}</td>
                  <td className="p-4">{row.missing.length ? row.missing.join(", ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
