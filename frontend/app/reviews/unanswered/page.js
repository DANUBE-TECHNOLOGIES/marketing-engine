import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getUnansweredReviews() {
  const res = await fetch("http://backend:4000/reviews/unanswered", {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Erreur chargement avis sans réponse");
  }

  return res.json();
}

export default async function UnansweredReviewsPage() {
  const reviews = await getUnansweredReviews();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Avis sans réponse"
          subtitle="Liste des avis clients à traiter en priorité."
        />

        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <p className="text-sm text-gray-500">Avis à traiter</p>
          <p className="text-3xl font-bold">{reviews.length}</p>
        </div>

        <div className="space-y-4">
          {reviews.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">
              Aucun avis sans réponse.
            </div>
          )}

          {(reviews ?? []).map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg">{review.authorName}</h2>
                  <p className="text-sm text-gray-500">
                    {review.agency.name} — {review.agency.city}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    Note : {review.rating}/5
                  </p>
                </div>

                <ButtonLink href={`/reviews/agency/${review.agencyId}`}>
                  Répondre
                </ButtonLink>
              </div>

              <p className="mt-4">
                {review.comment || "Aucun commentaire."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
