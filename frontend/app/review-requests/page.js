import MainLayout from "../components/MainLayout";

async function getRequests() {
  try {
    const res = await fetch("http://backend:4000/review-engine/requests", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      draft: 0,
      ready: 0,
      sent: 0,
      reviewed: 0,
      requests: []
    };
  }
}

export default async function Page() {
  const data = await getRequests();
  const requests = data.requests || [];

  return (
    <MainLayout
      title="Demandes d’avis"
      subtitle="File de demandes d’avis Google prêtes pour WhatsApp ou traitement manuel"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-3xl font-bold">{data.total}</div>
        </div>

        <div className="bg-slate-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Brouillons</div>
          <div className="text-3xl font-bold">{data.draft}</div>
        </div>

        <div className="bg-blue-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Prêtes</div>
          <div className="text-3xl font-bold">{data.ready}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Envoyées</div>
          <div className="text-3xl font-bold">{data.sent}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Avis obtenus</div>
          <div className="text-3xl font-bold">{data.reviewed}</div>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="bg-white rounded-2xl shadow p-6">
            <div className="text-xs uppercase text-gray-500 mb-1">
              {request.agency?.city} · {request.status}
            </div>

            <h2 className="text-xl font-bold">
              {request.clientName || "Client à compléter"}
            </h2>

            <p className="text-gray-600 mt-1">
              {request.agency?.name}
            </p>

            <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-line">
              {request.message}
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune demande d’avis.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
