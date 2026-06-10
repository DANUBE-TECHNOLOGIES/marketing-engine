import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getStats() {
  const res = await fetch("http://backend:4000/seo-cluster-calendar/stats?month=2026-06", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur stats calendrier SEO");

  return res.json();
}

export default async function SeoClusterCalendarStatsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getStats();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Stats calendrier SEO"
          subtitle={`Suivi validation/publication — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-cluster-calendar">Calendrier SEO</ButtonLink>
              <ButtonLink href="/seo-cluster-google-posts">Posts clusters</ButtonLink>
              <a href="http://localhost:4000/seo-cluster-calendar/stats/export?month=2026-06" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={data.total} />
          <StatCard label="Planifiés" value={data.planned} />
          <StatCard label="Validés" value={data.validated} />
          <StatCard label="Publiés" value={data.published} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Cluster</th>
                <th className="text-left p-4">Keyword</th>
                <th className="text-left p-4">Statut</th>
              </tr>
            </thead>

            <tbody>
              {data.rows.map((post) => (
                <tr key={post.key} className="border-b hover:bg-gray-50">
                  <td className="p-4">{post.publicationDate}</td>
                  <td className="p-4 font-semibold">{post.agencyName}</td>
                  <td className="p-4">{post.cluster}</td>
                  <td className="p-4">{post.keyword}</td>
                  <td className="p-4">{post.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
