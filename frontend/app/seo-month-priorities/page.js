import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getPriorities() {
  const res = await fetch("http://backend:4000/seo-month-priorities?month=2026-06", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur priorités SEO");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function SeoMonthPrioritiesPage() {
  await requireRole(["admin", "manager"]);

  const data = await getPriorities();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Priorités SEO du mois"
          subtitle={`Actions classées par ordre d’urgence — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-direction">SEO Direction</ButtonLink>
              <ButtonLink href="/seo-today">SEO Today</ButtonLink>
              <a href="http://localhost:4000/seo-month-priorities/export?month=2026-06" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/seo-playbook">Mode opératoire SEO</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Priorités" value={data.total} />
          <StatCard label="Hautes" value={data.high} />
          <StatCard label="Moyennes" value={data.medium} />
        </div>

        <div className="space-y-4">
          {data.priorities.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm text-gray-500">#{index + 1} · {item.type}</div>
                  <div className="font-bold text-lg">{item.title}</div>
                </div>

                <span className={`text-xs px-2 py-1 rounded h-fit ${priorityClass(item.priority)}`}>
                  {item.priority}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-4">
                {item.detail}
              </div>

              <ButtonLink href={item.link}>Traiter</ButtonLink>
            </div>
          ))}

          {data.priorities.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Aucune priorité SEO ce mois-ci.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
