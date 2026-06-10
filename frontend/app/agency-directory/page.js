import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getDirectory() {

  const res = await fetch(
    "http://backend:4000/agency-directory",
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur annuaire agences");
  }

  return res.json();
}

export default async function AgencyDirectoryPage() {

  await requireRole(["admin", "manager"]);

  const data = await getDirectory();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Référentiel agences"
          subtitle="Base centrale des données agences Mondescale."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/admin-network">
                Admin réseau
              </ButtonLink>

              <a href="http://localhost:4000/agency-directory/import-template" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Modèle import</a>
              <a href="http://localhost:4000/agency-directory/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/mvp-status">
                MVP Status
              </ButtonLink>

            </div>
          }
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-gray-900 text-white">

              <tr>

                <th className="text-left p-4">
                  Agence
                </th>

                <th className="text-left p-4">
                  Ville
                </th>

                <th className="text-left p-4">
                  Téléphone
                </th>

                <th className="text-left p-4">
                  Email
                </th>

                <th className="text-left p-4">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {data.agencies.map((agency) => (

                <tr
                  key={agency.id}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="p-4 font-semibold">
                    {agency.name}
                  </td>

                  <td className="p-4">
                    {agency.city}
                  </td>

                  <td className="p-4">
                    {agency.phone}
                  </td>

                  <td className="p-4">
                    {agency.email}
                  </td>

                  <td className="p-4">

                    <div className="flex gap-2">

                      <ButtonLink href={`/agency-directory/${agency.code}`}>
                        Fiche
                      </ButtonLink>

                    </div>

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
