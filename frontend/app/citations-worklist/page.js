import MainLayout from "../components/MainLayout";

async function getWorklist() {
  try {
    const res = await fetch("http://backend:4000/citations/worklist", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      listings: []
    };
  }
}

export default async function Page() {
  const data = await getWorklist();
  const listings = data.listings || [];

  return (
    <MainLayout
      title="Worklist citations"
      subtitle="Annuaires à compléter, vérifier ou corriger"
    >
      <div className="bg-white rounded-2xl shadow p-5 mb-8">
        <div className="text-sm text-gray-500">Citations à traiter</div>
        <div className="text-3xl font-bold">{data.total}</div>
      </div>

      <div className="space-y-4">
        {listings.map((listing) => (
          <div key={listing.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {listing.city} · {listing.status}
                </div>

                <h2 className="text-xl font-bold">
                  {listing.directoryName || "Annuaire"}
                </h2>

                <p className="mt-2 text-gray-700">
                  {listing.agencyName}
                </p>
              </div>

              <div className="text-right text-sm">
                {listing.directoryUrl && (
                  <a
                    href={listing.directoryUrl}
                    target="_blank"
                    className="underline"
                  >
                    Ouvrir l’annuaire
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 bg-slate-50 rounded-xl p-4 text-sm">
              <div className="font-bold mb-2">Informations NAP à utiliser</div>
              <div>{listing.agency.name}</div>
              <div>{listing.agency.address}</div>
              <div>{listing.agency.postalCode} {listing.agency.city}</div>
              <div>{listing.agency.phone}</div>
              <div>{listing.agency.email}</div>
              <div>{listing.agency.website}</div>
            </div>
          </div>
        ))}

        {listings.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune citation à traiter.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
