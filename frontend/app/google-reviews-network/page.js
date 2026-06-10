import MainLayout from "../components/MainLayout";

async function getReviews() {
  const res = await fetch("http://backend:4000/google-reviews-network", {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Erreur chargement avis Google");
  }

  return res.json();
}

export default async function GoogleReviewsNetworkPage() {
  const data = await getReviews();

  return (
    <MainLayout
      title="Avis Google réseau"
      subtitle="Derniers avis Google importés dans Local Engine."
    >
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="font-bold text-lg">
          {data.total} derniers avis affichés
        </div>
      </div>

      <div className="space-y-4">
        {(data.reviews ?? []).map((review) => (
          <div key={review.id} className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between gap-4">
              <div>
                <div className="font-bold">
                  {review.agency?.name || "Agence inconnue"}
                </div>
                <div className="text-sm text-gray-500">
                  {review.authorName}
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold">⭐ {review.rating}/5</div>
                <div className="text-sm text-gray-500">
                  {review.status === "replied" ? "Répondu" : "À traiter"}
                </div>
              </div>
            </div>

            {review.comment && (
              <div className="mt-4 text-gray-800">
                {review.comment}
              </div>
            )}

            {review.reply && (
              <div className="mt-4 bg-[#f4f8fb] rounded-xl p-4 text-sm">
                <strong>Réponse :</strong> {review.reply}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-400">
              {review.publishedAt}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
