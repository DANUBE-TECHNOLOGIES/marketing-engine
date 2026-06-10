import MainLayout from "../components/MainLayout";

async function getData() {
  try {
    const res = await fetch("http://backend:4000/directories/worklist", {
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
  const data = await getData();
  const listings = data.listings || [];

  return (
    <MainLayout
      title="Worklist Citations"
      subtitle="Annuaires à créer, vérifier ou corriger"
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
                  {listing.city} · {listing.status} · score {listing.score}
                </div>

                <h2 className="text-xl font-bold">
                  {listing.directoryName}
                </h2>

                <p className="text-gray-600 mt-1">
                  {listing.agencyName}
                </p>
              </div>

              <div className="text-right">
                {listing.directoryWebsite && (
                  <a
                    href={listing.directoryWebsite}
                    target="_blank"
                    className="underline text-sm"
                  >
                    Ouvrir annuaire
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 bg-slate-50 rounded-xl p-4 text-sm">
              <div className="font-bold mb-2">NAP officiel à utiliser</div>
              <div>{listing.nap.name}</div>
              <div>{listing.nap.address}</div>
              <div>{listing.nap.postalCode} {listing.nap.city}</div>
              <div>{listing.nap.phone}</div>
              <div>{listing.nap.email}</div>
              <div>{listing.nap.website}</div>
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
