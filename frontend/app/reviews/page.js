import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";
import ReviewActionButton from "../components/ReviewActionButton";

async function getReviews() {
  const res = await fetch("http://backend:4000/reviews", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement avis");

  return res.json();
}

function statusClass(status) {
  if (status === "published") return "bg-green-100 text-green-800";
  if (status === "validated") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function ReviewsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getReviews();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Avis Google"
          subtitle="Réponses IA SEO locales"
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-recommendations">
                IA SEO
              </ButtonLink>

              <ButtonLink href="/">
                Dashboard
              </ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Avis</div>
            <div className="text-3xl font-bold">{data.total}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">À traiter</div>
            <div className="text-3xl font-bold">{data.pending}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Validés</div>
            <div className="text-3xl font-bold">{data.validated}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Publiés</div>
            <div className="text-3xl font-bold">{data.published}</div>
          </div>
        </div>

        <div className="space-y-4">
          {(data.reviews ?? []).map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">
                    {review.agencyName}
                  </div>

                  <div className="text-sm text-gray-500">
                    {review.city}
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${statusClass(review.responseStatus)}`}>
                  {review.responseStatus}
                </span>
              </div>

              <div className="mb-4">
                <div className="font-semibold">
                  {review.author} — {review.rating}★
                </div>

                <div className="text-sm text-gray-700 mt-2">
                  {review.text}
                </div>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <div className="font-semibold mb-2">
                  Réponse IA SEO :
                </div>

                <div className="text-sm whitespace-pre-line">
                  {review.seoResponse}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <CopyButton text={review.seoResponse} />

                <div className="flex gap-2">
                  {review.responseStatus === "pending" && (
                    <ReviewActionButton
                      reviewId={review.id}
                      action="validate"
                      label="Valider"
                    />
                  )}

                  {review.responseStatus !== "published" && (
                    <ReviewActionButton
                      reviewId={review.id}
                      action="publish"
                      label="Publier"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
