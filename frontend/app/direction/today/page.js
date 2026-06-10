import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getToday() {
  const res = await fetch("http://backend:4000/direction/today", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement aujourd’hui");

  return res.json();
}

export default async function DirectionTodayPage() {
  await requireRole(["admin", "manager"]);

  const data = await getToday();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="À faire aujourd’hui"
          subtitle="Vue opérationnelle des actions prioritaires du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/google-post-validation">Validation posts</ButtonLink>
              <ButtonLink href="/review-requests/actions">Actions avis</ButtonLink>
              <ButtonLink href="/direction">Direction</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Posts à valider</div>
            <div className="text-3xl font-bold">{data.postsToValidateCount}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Agences à relancer avis</div>
            <div className="text-3xl font-bold">{data.reputationActionsCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Google Posts à valider</div>

            <div className="space-y-3">
              {data.postsToValidate.map((post) => (
                <div key={post.validationKey} className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">{post.publicationDate}</div>
                  <div className="font-semibold">{post.agencyName}</div>
                  <div className="text-sm">{post.title}</div>
                </div>
              ))}

              {data.postsToValidate.length === 0 && (
                <div className="text-sm text-gray-500">Aucun post en attente.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Demandes d’avis à envoyer</div>

            <div className="space-y-3">
              {data.reputationActions.map((agency) => (
                <div key={agency.agencyId} className="border rounded-lg p-3">
                  <div className="font-semibold">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                  <div className="text-sm">Reste à envoyer : {agency.remaining}</div>
                </div>
              ))}

              {data.reputationActions.length === 0 && (
                <div className="text-sm text-gray-500">Objectifs avis atteints.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
