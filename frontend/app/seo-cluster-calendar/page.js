import SeoClusterStatusButton from "../components/SeoClusterStatusButton";
import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";

function addMonth(month, offset) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getCalendar(month) {
  const res = await fetch(`http://backend:4000/seo-cluster-calendar?month=${month}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur calendrier SEO");

  return res.json();
}

async function getStatuses() {
  const res = await fetch("http://backend:4000/seo-cluster-calendar/statuses", {
    cache: "no-store"
  });

  if (!res.ok) return {};

  return res.json();
}

export default async function SeoClusterCalendarPage({ searchParams }) {
  await requireRole(["admin", "manager"]);

  const selectedMonth = searchParams?.month || "2026-06";
  const data = await getCalendar(selectedMonth);
  const statuses = await getStatuses();

  const previousMonth = addMonth(selectedMonth, -1);
  const nextMonth = addMonth(selectedMonth, 1);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Calendrier SEO clusters"
          subtitle={`Planning Google Posts par intention SEO — ${selectedMonth}`}
          action={
            <div className="flex gap-2">
              <a
                href={`http://localhost:4000/seo-cluster-calendar/export?month=${selectedMonth}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Export CSV
              </a>
              <ButtonLink href="/seo-cluster-google-posts">Posts clusters</ButtonLink>
              <ButtonLink href="/seo-keyword-clusters">Clusters SEO</ButtonLink>
            </div>
          }
        />

        <div className="flex justify-between items-center gap-3 mb-6">
          <div className="flex gap-2">
            <a href={`/seo-cluster-calendar?month=${previousMonth}`} className="bg-white border px-4 py-2 rounded-lg text-sm">
              ← Mois précédent
            </a>
            <a href={`/seo-cluster-calendar?month=${nextMonth}`} className="bg-white border px-4 py-2 rounded-lg text-sm">
              Mois suivant →
            </a>
          </div>

          <div className="bg-black text-white px-4 py-2 rounded-lg text-sm">
            {data.total} post(s)
          </div>
        </div>

        <div className="space-y-4">
          {data.posts.map((post, index) => {
            const postKey = `${post.publicationDate}-${post.agencyName}-${post.cluster}`;
            const currentStatus = statuses[postKey] || post.status;

            return (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm text-gray-500">{post.publicationDate}</div>
                  <div className="font-bold text-lg">{post.agencyName}</div>
                  <div className="text-sm text-gray-500">{post.city}</div>
                </div>

                <div className="flex gap-2">
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded h-fit">
                    {post.cluster}
                  </span>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded h-fit">
                    {currentStatus}
                  </span>
                </div>
              </div>

              <div className="text-xs text-blue-700 font-semibold mb-2">
                Keyword : {post.keyword}
              </div>

              <div className="font-semibold mb-2">{post.title}</div>
              <div className="text-sm whitespace-pre-line leading-6">{post.content}</div>

              <div className="mt-4 flex justify-between items-center gap-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  CTA : {post.cta}
                </span>
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={`${post.publicationDate}\n\n${post.title}\n\n${post.content}\n\nCTA : ${post.cta}`} />
                  <SeoClusterStatusButton postKey={postKey} status="validated" label="Valider" />
                  <SeoClusterStatusButton postKey={postKey} status="published" label="Publié" />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
