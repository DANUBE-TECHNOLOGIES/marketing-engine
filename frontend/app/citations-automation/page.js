import MainLayout from "../components/MainLayout";
import CitationAutomationButtons from "./CitationAutomationButtons";

async function getQueue() {
  try {
    const res = await fetch("http://backend:4000/citations/automation-queue", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      manual: 0,
      email: 0,
      api: 0,
      listings: []
    };
  }
}

export default async function Page() {
  const data = await getQueue();
  const listings = data.listings || [];

  return (
    <MainLayout
      title="Automatisation citations"
      subtitle="Préparation automatique des inscriptions annuaires locaux"
    >
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">À traiter</div>
          <div className="text-3xl font-bold">{data.total}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Manuel assisté</div>
          <div className="text-3xl font-bold">{data.manual}</div>
        </div>

        <div className="bg-blue-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Email</div>
          <div className="text-3xl font-bold">{data.email}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">API</div>
          <div className="text-3xl font-bold">{data.api}</div>
        </div>
      </div>

      <CitationAutomationButtons />

      <div className="space-y-4">
        {listings.map((listing) => (
          <div key={listing.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {listing.city} · {listing.submissionMode} · {listing.automationStatus}
                </div>

                <h2 className="text-xl font-bold">
                  {listing.directoryName || "Annuaire"}
                </h2>

                <p className="text-gray-600 mt-1">
                  {listing.agencyName}
                </p>
              </div>

              <div className="text-right">
                {listing.submissionUrl && (
                  <a
                    href={listing.submissionUrl}
                    target="_blank"
                    className="underline text-sm"
                  >
                    Ouvrir inscription
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="font-bold mb-2">NAP prêt à copier</div>
                <div>{listing.payload.business.name}</div>
                <div>{listing.payload.business.address}</div>
                <div>
                  {listing.payload.business.postalCode} {listing.payload.business.city}
                </div>
                <div>{listing.payload.business.phone}</div>
                <div>{listing.payload.business.email}</div>
                <div>{listing.payload.business.website}</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="font-bold mb-2">Description</div>
                <div>{listing.payload.business.description}</div>
              </div>
            </div>
          </div>
        ))}

        {listings.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune citation à automatiser.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
