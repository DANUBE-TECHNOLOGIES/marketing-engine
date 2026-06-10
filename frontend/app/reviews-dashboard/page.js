import MainLayout from "../components/MainLayout";

async function getSummary() {
  try {
    const res = await fetch("http://backend:4000/reviews/summary", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return [];
  }
}

async function getPending() {
  try {
    const res = await fetch("http://backend:4000/reviews/unanswered", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return [];
  }
}

async function getNetwork() {
  try {
    const res = await fetch("http://backend:4000/review-network", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      totalAgencies: 0,
      totalReviews30: 0,
      high: 0,
      medium: 0,
      ok: 0,
      rows: []
    };
  }
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default async function Page() {
  const summary = await getSummary();
  const pending = await getPending();
  const network = await getNetwork();

  const totalReviews = summary.reduce((s, r) => s + (r.total || 0), 0);
  const monthlyReviews = summary.reduce((s, r) => s + (r.monthlyReviews || 0), 0);
  const unanswered = summary.reduce((s, r) => s + (r.unanswered || 0), 0);

  return (
    <MainLayout
      title="Avis Google"
      subtitle="Pilotage réseau des avis, réponses IA et demandes d’avis"
    >
      <div className="grid grid-cols-5 gap-4 mb-8">
        <Card label="Avis total" value={totalReviews} />
        <Card label="Avis ce mois" value={monthlyReviews} />
        <Card label="À répondre" value={unanswered} />
        <Card label="Priorité haute" value={network.high} />
        <Card label="Avis 30j" value={network.totalReviews30} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <a href="/reviews-ai" className="bg-blue-50 rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Réponses IA</div>
          <div className="text-xl font-bold mt-2">Générer / valider</div>
        </a>

        <a href="/reviews/unanswered" className="bg-red-50 rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Avis sans réponse</div>
          <div className="text-xl font-bold mt-2">{pending.length} à traiter</div>
        </a>

        <a href="/review-network" className="bg-green-50 rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Réseau</div>
          <div className="text-xl font-bold mt-2">Objectifs par agence</div>
        </a>

        <a href="/review-engine" className="bg-white rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Demandes d’avis</div>
          <div className="text-xl font-bold mt-2">Générer demandes</div>
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Synthèse par agence</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>Total avis</th>
                <th>Avis mois</th>
                <th>Sans réponse</th>
                <th>Note moyenne</th>
              </tr>
            </thead>

            <tbody>
              {summary.map((row) => (
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">{row.agencyName}</td>
                  <td>{row.city}</td>
                  <td>{row.total}</td>
                  <td>{row.monthlyReviews}</td>
                  <td>{row.unanswered}</td>
                  <td>{row.averageRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Derniers avis à traiter</h2>

        <div className="space-y-4">
          {pending.slice(0, 10).map((review) => (
            <div key={review.id} className="border rounded-xl p-4">
              <div className="text-xs uppercase text-gray-500">
                {review.agency?.city} · {review.rating}/5 · {review.status}
              </div>

              <div className="font-bold mt-1">
                {review.authorName}
              </div>

              <div className="text-sm text-gray-700 mt-2">
                {review.comment || "Avis sans commentaire"}
              </div>

              <div className="mt-3 flex gap-3 text-sm">
                <a href={`/reviews/agency/${review.agencyId}`} className="underline">
                  Voir agence
                </a>

                <a href="/reviews-ai" className="underline">
                  Générer réponse IA
                </a>
              </div>
            </div>
          ))}

          {pending.length === 0 && (
            <div className="text-gray-500">
              Aucun avis en attente de réponse.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
