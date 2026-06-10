import ReviewReplyForm from "./ReviewReplyForm";
import PageHeader from "../../../components/PageHeader";

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur API");
  return res.json();
}

export default async function AgencyReviewsPage({ params }) {
  const resolvedParams = await params;
  const agencyId = Number(resolvedParams.id);

  const agencies = await getJson("http://backend:4000/agencies");
  const reviews = await getJson(`http://backend:4000/agency/${agencyId}/reviews`);

  const agency = agencies.find((a) => a.id === agencyId);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={`Avis — ${agency?.name || "Agence"}`}
          subtitle="Réponse manuelle aux avis clients."
        />

        <div className="space-y-4">
          {reviews.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">
              Aucun avis enregistré pour cette agence.
            </div>
          )}

          {(reviews ?? []).map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg">{review.authorName}</h2>
                  <p className="text-sm text-gray-500">
                    Note : {review.rating}/5
                  </p>
                </div>

                <span className="text-sm font-semibold">
                  {review.reply ? "Répondu" : "Sans réponse"}
                </span>
              </div>

              <p className="mt-4 text-gray-800">
                {review.comment || "Aucun commentaire."}
              </p>

              {review.reply && (
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-1">Réponse :</p>
                  <p>{review.reply}</p>
                </div>
              )}

              {!review.reply && (
                <ReviewReplyForm
  reviewId={review.id}
  rating={review.rating}
  comment={review.comment}
  agencyName={agency?.name}
  city={agency?.city}
/>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
