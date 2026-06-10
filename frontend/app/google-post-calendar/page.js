import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";

function addMonth(month, offset) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getGooglePostCalendar(month) {
  const res = await fetch(`http://backend:4000/google-post-calendar?month=${month}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur lors du chargement du calendrier Google Posts");

  return res.json();
}

export default async function GooglePostCalendarPage({ searchParams }) {
  await requireRole(["admin", "manager"]);
  const selectedMonth = searchParams?.month || "2026-05";
  const agencyFilter = searchParams?.agency || "all";
  const calendar = await getGooglePostCalendar(selectedMonth);
  const posts = calendar.posts || [];
  const agencies = [...new Set(posts.map((p) => p.agencyName))];

  const filteredPosts =
    agencyFilter === "all"
      ? posts
      : posts.filter(
          (post) =>
            post.agencyName.toLowerCase() ===
            decodeURIComponent(agencyFilter).toLowerCase()
        );

  const previousMonth = addMonth(selectedMonth, -1);
  const nextMonth = addMonth(selectedMonth, 1);
  const agencyQuery = agencyFilter === "all" ? "" : `&agency=${encodeURIComponent(agencyFilter)}`;

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Calendrier Google Posts"
          subtitle={`Planning éditorial réseau — ${calendar.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/google-posts">Voir les posts</ButtonLink>
              <ButtonLink href="/">Retour dashboard</ButtonLink>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <a href={`/google-post-calendar?month=${previousMonth}${agencyQuery}`} className="bg-white border px-4 py-2 rounded-lg text-sm">← Mois précédent</a>
            <a href={`/google-post-calendar?month=${nextMonth}${agencyQuery}`} className="bg-white border px-4 py-2 rounded-lg text-sm">Mois suivant →</a>
            <a href={`http://localhost:4000/google-post-calendar/export?month=${selectedMonth}`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export calendrier CSV</a>
          </div>

          <div className="bg-black text-white px-4 py-2 rounded-lg text-sm">
            {filteredPosts.length} post(s) — {calendar.month}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <a href={`/google-post-calendar?month=${selectedMonth}`} className={`px-3 py-2 rounded-lg text-sm ${agencyFilter === "all" ? "bg-black text-white" : "bg-white border"}`}>
            Toutes les agences
          </a>

          {agencies.map((agency) => (
            <a key={agency} href={`/google-post-calendar?month=${selectedMonth}&agency=${encodeURIComponent(agency)}`} className={`px-3 py-2 rounded-lg text-sm ${agencyFilter === agency ? "bg-black text-white" : "bg-white border"}`}>
              {agency}
            </a>
          ))}
        </div>

        <div className="space-y-4">
          {filteredPosts.map((post, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm text-gray-500">{post.publicationDate}</div>
                  <div className="font-bold text-lg">{post.agencyName}</div>
                  <div className="text-sm text-gray-500">{post.city}</div>
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{post.theme}</span>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{post.tone}</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    Duplication : {post.duplicateRiskScore}%
                  </span>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">{post.status}</span>
                </div>
              </div>

              <div className="font-semibold mb-2">{post.title}</div>
              <div className="text-sm leading-6 whitespace-pre-line">{post.content}</div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">CTA : {post.cta}</span>
                <CopyButton text={`${post.publicationDate}\n\n${post.title}\n\n${post.content}\n\nCTA : ${post.cta}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
