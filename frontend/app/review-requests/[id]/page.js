import PageHeader from "../../components/PageHeader";
import ReviewRequestActions from "./ReviewRequestActions";

async function getRequest(id) {
  const res = await fetch(`http://backend:4000/review-requests`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement demande");

  const requests = await res.json();
  return requests.find((r) => r.id === Number(id));
}

export default async function ReviewRequestDetailPage({ params }) {
  const resolvedParams = await params;
  const request = await getRequest(resolvedParams.id);

  if (!request) {
    return <main className="p-8">Demande introuvable</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={`Demande d’avis — ${request.clientName}`}
          subtitle={`${request.agency.name} — ${request.channel}`}
        />

        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500 mb-2">Message à envoyer</p>

          <pre className="whitespace-pre-wrap bg-gray-100 rounded-lg p-5 text-sm">
            {request.message}
          </pre>

          <ReviewRequestActions
            requestId={request.id}
            message={request.message}
            phone={request.clientPhone}
            channel={request.channel}
          />
        </div>
      </div>
    </main>
  );
}
