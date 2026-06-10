import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getFixPlan() {
  const res = await fetch("http://backend:4000/agency-directory/fix-plan", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur plan correction référentiel");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function AgencyDirectoryFixPlanPage() {
  await requireRole(["admin", "manager"]);

  const data = await getFixPlan();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Plan correction référentiel"
          subtitle="Actions à réaliser pour compléter les données agences Mondescale."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory-completion">Complétion</ButtonLink>
              <ButtonLink href="/agency-directory-quality">Qualité</ButtonLink>
              <a href="http://localhost:4000/agency-directory/fix-plan/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
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
                  <div className="text-sm text-gray-500">{action.code}</div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(action.priority)}`}>
                  {action.priority}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-3">
                {action.description}
              </div>

              <div className="flex flex-wrap gap-2">
                {action.fields.map((field) => (
                  <span key={field} className="bg-gray-100 px-3 py-2 rounded-lg text-xs">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {data.actions.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Référentiel complet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
