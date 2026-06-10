import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getOnboarding() {
  const res = await fetch("http://backend:4000/agency-onboarding", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur onboarding agence");

  return res.json();
}

export default async function AgencyOnboardingPage() {
  await requireRole(["admin", "manager"]);

  const data = await getOnboarding();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Onboarding agences"
          subtitle="Checklist SEO locale pour vérifier qu’une agence est prête à être pilotée."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
              <ButtonLink href="/">Accueil</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StatCard label="Agences" value={data.totalAgencies} />
          <StatCard label="Score moyen onboarding" value={`${data.averageScore}%`} />
        </div>

        <div className="space-y-6">
          {data.rows.map((agency) => (
            <div key={agency.agencyId} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-lg">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                </div>

                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
                  {agency.score}% — {agency.completed}/{agency.total}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agency.checklist.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-lg p-3 text-sm ${
                      item.ok
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.ok ? "✓" : "✕"} {item.label}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <ButtonLink href={`/agency-portal/${agency.agencyId}`}>
                  Portail agence
                </ButtonLink>
                <ButtonLink href={`/agency/${agency.agencyId}`}>
                  Fiche SEO
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
