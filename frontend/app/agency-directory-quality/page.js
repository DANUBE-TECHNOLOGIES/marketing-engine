import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getQuality() {
  const res = await fetch("http://backend:4000/agency-directory/quality", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur qualité référentiel");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "Haute") return "bg-red-100 text-red-800";
  if (priority === "Moyenne") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function AgencyDirectoryQualityPage() {
  await requireRole(["admin", "manager"]);

  const data = await getQuality();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Qualité référentiel agences"
          subtitle="Contrôle des données nécessaires aux avis, Google Posts et SEO local."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Agences" value={data.totalAgencies} />
          <StatCard label="Score moyen" value={`${data.averageScore}%`} />
          <StatCard label="À corriger" value={data.toFix} />
        </div>

        <div className="space-y-4">
          {data.rows.map((agency) => (
            <div key={agency.code} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded h-fit ${priorityClass(agency.priority)}`}>
                    {agency.priority}
                  </span>
                  <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded h-fit">
                    {agency.score}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agency.checks.map((check) => (
                  <div
                    key={check.key}
                    className={`rounded-lg p-3 text-sm ${
                      check.ok
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {check.ok ? "✓" : "✕"} {check.label}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <ButtonLink href={`/agency-directory/${agency.code}`}>
                  Ouvrir la fiche
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
