import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getAiCenter() {
  const res = await fetch("http://backend:4000/seo-ai-center", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur centre IA");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function SeoAiCenterPage() {
  await requireRole(["admin", "manager"]);

  const data = await getAiCenter();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Centre IA SEO"
          subtitle="Recommandations intelligentes générées automatiquement."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/monthly-report">Rapport</ButtonLink>
              <ButtonLink href="/monthly-action-plan">Plan mensuel</ButtonLink>
              <ButtonLink href="/global-actions">Actions</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Recommandations" value={data.total} />
          <StatCard label="Critiques" value={data.critical} />
          <StatCard label="Moyennes" value={data.medium} />
        </div>

        <div className="space-y-4">
          {data.recommendations.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">

              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">
                    {item.title}
                  </div>

                  <div className="text-sm text-gray-500">
                    {item.agencyName} — {item.city}
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(item.priority)}`}>
                  {item.priority}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-3">
                {item.recommendation}
              </div>

              <div className="text-xs text-blue-700 font-semibold mb-4">
                Impact estimé : {item.impact}
              </div>

              <ButtonLink href={item.link}>
                Traiter
              </ButtonLink>

            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
