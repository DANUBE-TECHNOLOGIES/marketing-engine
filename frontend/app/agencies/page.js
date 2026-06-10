import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getAgencies() {
  const res = await fetch("http://backend:4000/agencies", { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur chargement agences");
  return res.json();
}

export default async function AgenciesPage() {
  const agencies = await getAgencies();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Agences"
          subtitle="Liste des agences suivies dans Mondescale Local Engine."
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Nom</th>
                <th className="text-left p-4">Ville</th>
                <th className="text-left p-4">Adresse</th>
                <th className="text-left p-4">Téléphone</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => (
                <tr key={agency.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{agency.name}</td>
                  <td className="p-4">{agency.city}</td>
                  <td className="p-4">{agency.address}</td>
                  <td className="p-4">{agency.phone}</td>
                  <td className="p-4">
                    <ButtonLink href={`/agency/${agency.id}`}>
                      Voir annuaires
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
