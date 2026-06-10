import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getActions() {
  const res = await fetch("http://backend:4000/review-requests/actions", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement actions avis");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "Haute") return "bg-red-100 text-red-800";
  if (priority === "Moyenne") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function ReviewRequestActionsPage() {
  await requireRole(["admin", "manager"]);

  const actions = await getActions();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Actions demandes d’avis"
          subtitle="Priorités pour atteindre l’objectif de 3 avis Google par agence et par mois."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/review-requests/stats">Statistiques</ButtonLink>
              <ButtonLink href="/review-requests/new">Nouvelle demande</ButtonLink>
            </div>
          }
        />

        <div className="space-y-4">
          {actions.map((item) => (
            <div key={item.agencyId} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">{item.agencyName}</div>
                  <div className="text-sm text-gray-500">{item.city}</div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(item.priority)}`}>
                  Priorité {item.priority}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-gray-500">Objectif</div>
                  <div className="font-bold">{item.monthlyTarget}</div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-gray-500">Envoyées</div>
                  <div className="font-bold">{item.sent}</div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-gray-500">Brouillons</div>
                  <div className="font-bold">{item.drafts}</div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-gray-500">Reste</div>
                  <div className="font-bold">{item.remaining}</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <strong>Action :</strong> {item.action}
              </div>

              {item.remaining > 0 && (
                <div className="mt-4">
                  <ButtonLink href="/review-requests/new">
                    Créer une demande
                  </ButtonLink>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
