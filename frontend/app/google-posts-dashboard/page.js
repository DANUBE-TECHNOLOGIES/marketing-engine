import MainLayout from "../components/MainLayout";

async function getDashboard() {
  try {
    const res = await fetch("http://backend:4000/google-posts-dashboard", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalAgencies: 0,
      totalDraft: 0,
      totalApproved: 0,
      totalQueued: 0,
      totalPublished: 0,
      totalErrors: 0,
      rows: []
    };
  }
}

export default async function Page() {
  const data = await getDashboard();
  const rows = data.rows || [];

  return (
    <MainLayout
      title="Dashboard Google Posts"
      subtitle="Pilotage de la production Google Posts par agence"
    >
      <div className="grid grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Brouillons</div>
          <div className="text-3xl font-bold">{data.totalDraft}</div>
        </div>

        <div className="bg-blue-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Approuvés</div>
          <div className="text-3xl font-bold">{data.totalApproved}</div>
        </div>

        <div className="bg-orange-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">En file</div>
          <div className="text-3xl font-bold">{data.totalQueued}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Publiés</div>
          <div className="text-3xl font-bold">{data.totalPublished}</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Erreurs</div>
          <div className="text-3xl font-bold">{data.totalErrors}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Agences</div>
          <div className="text-3xl font-bold">{data.totalAgencies}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Production par agence
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Brouillons</th>
                <th>Approuvés</th>
                <th>En file</th>
                <th>Publiés 30j</th>
                <th>Total publiés</th>
                <th>Erreurs</th>
                <th>Dernier post</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">
                    {row.agencyName}
                  </td>

                  <td>{row.city}</td>
                  <td>{row.draft}</td>
                  <td>{row.approved}</td>
                  <td>{row.queued}</td>
                  <td>{row.published30}</td>
                  <td>{row.published}</td>
                  <td>{row.error}</td>

                  <td>
                    {row.lastPublishedAt
                      ? new Date(row.lastPublishedAt).toLocaleDateString("fr-FR")
                      : "-"}
                  </td>

                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
