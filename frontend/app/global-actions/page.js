import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getActions() {
  const res = await fetch("http://backend:4000/agency-global-actions", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement actions globales");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function GlobalActionsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getActions();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Actions globales prioritaires"
          subtitle="Actions calculées à partir des citations, Google Posts, avis et rankings."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/global-scores">Scores globaux</ButtonLink>
              <ButtonLink href="/direction/today">Aujourd’hui</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Actions" value={data.totalActions} />
          <StatCard label="Priorité haute" value={data.high} />
          <StatCard label="Priorité moyenne" value={data.medium} />
        </div>

        <div className="space-y-4">
          {data.actions.map((action, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">{action.title}</div>
                  <div className="text-sm text-gray-500">
                    {action.agencyName} — {action.city}
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(action.priority)}`}>
                  {action.priority}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-4">
                {action.description}
              </div>

              <ButtonLink href={action.link}>Traiter</ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
