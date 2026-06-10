import { requireAgencyAccess } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import ButtonLink from "../../components/ButtonLink";

async function getAgencyPortal(id) {
  const res = await fetch(`http://backend:4000/agency-portal/${id}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur portail agence");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high" || priority === "Haute") return "bg-red-100 text-red-800";
  if (priority === "medium" || priority === "Moyenne") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function AgencyPortalPage({ params }) {
  await requireAgencyAccess(params.id);
  const data = await getAgencyPortal(params.id);
  const agency = data.agency;
  const dashboard = data.dashboard || {};
  const rankings = data.rankings;

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={`Portail agence — ${agency.city}`}
          subtitle={agency.name}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/users">Utilisateurs</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Score citations" value={`${dashboard.citationScore || 0}%`} />
          <StatCard label="Annuaires OK" value={`${dashboard.directoriesOk || 0}/${dashboard.directoriesTotal || 0}`} />
          <StatCard label="À corriger" value={dashboard.directoriesToCorrect || 0} />
          <StatCard label="Absents" value={dashboard.directoriesMissing || 0} />
        </div>

        {rankings && (
          <div className="bg-white rounded-xl shadow p-5 mb-6">
            <div className="font-bold text-lg mb-4">Positions locales</div>
            <div className="text-sm text-gray-500 mb-4">
              Position moyenne : <strong>#{rankings.averagePosition}</strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rankings.keywords.map((keyword) => (
                <div key={keyword.keyword} className="bg-gray-100 rounded-lg p-4">
                  <div className="text-sm font-semibold">{keyword.keyword}</div>
                  <div className="text-2xl font-bold">#{keyword.position}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-4">Actions prioritaires agence</div>

          <div className="space-y-3">
            {data.actions.map((action, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex flex-wrap justify-between gap-3 mb-2">
                  <div className="font-semibold">{action.title}</div>
                  <span className={`text-xs px-2 py-1 rounded ${priorityClass(action.priority)}`}>
                    {action.priority}
                  </span>
                </div>
                <div className="text-sm text-gray-700">{action.description}</div>
              </div>
            ))}

            {data.actions.length === 0 && (
              <div className="text-sm text-gray-500">Aucune action prioritaire pour cette agence.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
