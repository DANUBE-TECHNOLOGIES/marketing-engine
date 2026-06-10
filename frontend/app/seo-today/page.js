import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getSeoToday() {
  const res = await fetch("http://backend:4000/seo-today?month=2026-06", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur SEO Today");

  return res.json();
}

export default async function SeoTodayPage() {
  await requireRole(["admin", "manager"]);

  const data = await getSeoToday();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="SEO Today"
          subtitle={`Actions SEO prioritaires du jour — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-cluster-calendar-stats">Stats SEO</ButtonLink>
              <ButtonLink href="/agency-directory-fix-plan">Référentiel</ButtonLink>
              <a href="http://localhost:4000/seo-today/export?month=2026-06" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/production">Production</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Notifications" value={data.summary.notifications} />
          <StatCard label="Posts à valider" value={data.summary.postsToValidate} />
          <StatCard label="Agences non prêtes" value={data.summary.agenciesNotReady} />
          <StatCard label="Corrections référentiel" value={data.summary.fixActions} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Posts SEO à valider</div>
            <div className="space-y-3">
              {data.postsToValidate.map((post) => (
                <div key={post.key} className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500">{post.publicationDate}</div>
                  <div className="font-semibold">{post.agencyName}</div>
                  <div className="text-sm">{post.cluster} · {post.keyword}</div>
                </div>
              ))}
              {data.postsToValidate.length === 0 && (
                <div className="text-sm text-gray-500">Aucun post à valider.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Agences non prêtes</div>
            <div className="space-y-3">
              {data.agenciesNotReady.map((agency) => (
                <div key={agency.code} className="border rounded-lg p-3">
                  <div className="font-semibold">{agency.agencyName}</div>
                  <div className="text-sm text-gray-500">{agency.city}</div>
                  <div className="text-xs mt-2">Manque : {agency.missing.join(", ")}</div>
                </div>
              ))}
              {data.agenciesNotReady.length === 0 && (
                <div className="text-sm text-gray-500">Toutes les agences sont prêtes.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Corrections référentiel</div>
            <div className="space-y-3">
              {data.fixActions.map((action, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-sm text-gray-500">{action.priority}</div>
                  <div className="text-xs mt-2">{action.fields.join(", ")}</div>
                </div>
              ))}
              {data.fixActions.length === 0 && (
                <div className="text-sm text-gray-500">Aucune correction.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
