import MainLayout from "../components/MainLayout";

async function getCampaigns() {
  try {
    const res = await fetch("http://backend:4000/review-campaigns", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      total: 0,
      active: 0,
      completed: 0,
      campaigns: []
    };
  }
}

export default async function Page() {
  const data = await getCampaigns();
  const campaigns = data.campaigns || [];

  return (
    <MainLayout
      title="Campagnes Avis Google"
      subtitle="Objectifs, progression et suivi des campagnes d’avis par agence"
    >
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Campagnes</div>
          <div className="text-3xl font-bold">{data.total}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Actives</div>
          <div className="text-3xl font-bold">{data.active}</div>
        </div>

        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Terminées</div>
          <div className="text-3xl font-bold">{data.completed}</div>
        </div>
      </div>

      <div className="space-y-5">
        {campaigns.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            Aucune campagne avis.
          </div>
        )}

        {campaigns.map(campaign => {
          const progress = campaign.targetReviews
            ? Math.min(100, Math.round((campaign.obtainedReviews / campaign.targetReviews) * 100))
            : 0;

          return (
            <div key={campaign.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="text-xs uppercase text-gray-500 mb-1">
                    {campaign.city} · {campaign.status}
                  </div>

                  <h2 className="text-xl font-bold">
                    {campaign.title}
                  </h2>

                  <p className="text-gray-600 mt-2">
                    {campaign.agencyName}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {progress}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {campaign.obtainedReviews} / {campaign.targetReviews} avis
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-green-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
