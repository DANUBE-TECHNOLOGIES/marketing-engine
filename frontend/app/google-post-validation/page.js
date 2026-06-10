import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";
import PostStatusButton from "../components/PostStatusButton";

function addMonth(month, offset) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getValidation(month) {
  const res = await fetch(`http://backend:4000/google-post-validation?month=${month}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement validation Google Posts");

  return res.json();
}

function statusLabel(status) {
  if (status === "published") return "Publié";
  if (status === "validated") return "Validé";
  return "À valider";
}

function statusClass(status) {
  if (status === "published") return "bg-green-100 text-green-800";
  if (status === "validated") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function GooglePostValidationPage({ searchParams }) {
  await requireRole(["admin", "manager"]);
  const selectedMonth = searchParams?.month || "2026-05";
  const agencyFilter = searchParams?.agency || "all";
  const statusFilter = searchParams?.status || "all";

  const data = await getValidation(selectedMonth);
  const posts = data.posts || [];
  const agencies = [...new Set(posts.map((p) => p.agencyName))];

  let filteredPosts = agencyFilter === "all"
    ? posts
    : posts.filter((p) => p.agencyName.toLowerCase() === decodeURIComponent(agencyFilter).toLowerCase());

  filteredPosts = statusFilter === "all"
    ? filteredPosts
    : filteredPosts.filter((p) => p.validationStatus === statusFilter);

  const previousMonth = addMonth(selectedMonth, -1);
  const nextMonth = addMonth(selectedMonth, 1);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Validation Direction"
          subtitle={`Validation des Google Posts — ${data.month}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/google-post-calendar">Calendrier</ButtonLink>
              <ButtonLink href="/google-posts">Posts</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{data.totalPosts}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">À valider</div>
            <div className="text-2xl font-bold">{data.toValidate}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Validés</div>
            <div className="text-2xl font-bold">{data.validated}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Publiés</div>
            <div className="text-2xl font-bold">{data.published}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <a className="bg-white border px-4 py-2 rounded-lg text-sm" href={`/google-post-validation?month=${previousMonth}`}>← Mois précédent</a>
          <a className="bg-white border px-4 py-2 rounded-lg text-sm" href={`/google-post-validation?month=${nextMonth}`}>Mois suivant →</a>
          <a className={`px-3 py-2 rounded-lg text-sm ${statusFilter === "all" ? "bg-black text-white" : "bg-white border"}`} href={`/google-post-validation?month=${selectedMonth}`}>Tous statuts</a>
          <a className={`px-3 py-2 rounded-lg text-sm ${statusFilter === "to_validate" ? "bg-black text-white" : "bg-white border"}`} href={`/google-post-validation?month=${selectedMonth}&status=to_validate`}>À valider</a>
          <a className={`px-3 py-2 rounded-lg text-sm ${statusFilter === "validated" ? "bg-black text-white" : "bg-white border"}`} href={`/google-post-validation?month=${selectedMonth}&status=validated`}>Validés</a>
          <a className={`px-3 py-2 rounded-lg text-sm ${statusFilter === "published" ? "bg-black text-white" : "bg-white border"}`} href={`/google-post-validation?month=${selectedMonth}&status=published`}>Publiés</a>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <a href={`/google-post-validation?month=${selectedMonth}&status=${statusFilter}`} className={`px-3 py-2 rounded-lg text-sm ${agencyFilter === "all" ? "bg-black text-white" : "bg-white border"}`}>
            Toutes les agences
          </a>
          {agencies.map((agency) => (
            <a key={agency} href={`/google-post-validation?month=${selectedMonth}&status=${statusFilter}&agency=${encodeURIComponent(agency)}`} className={`px-3 py-2 rounded-lg text-sm ${agencyFilter === agency ? "bg-black text-white" : "bg-white border"}`}>
              {agency}
            </a>
          ))}
        </div>

        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.validationKey} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm text-gray-500">{post.publicationDate}</div>
                  <div className="font-bold text-lg">{post.agencyName}</div>
                  <div className="text-sm text-gray-500">{post.city}</div>
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${statusClass(post.validationStatus)}`}>
                    {statusLabel(post.validationStatus)}
                  </span>
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{post.theme}</span>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{post.tone}</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Duplication : {post.duplicateRiskScore}%</span>
                </div>
              </div>

              <div className="font-semibold mb-2">{post.title}</div>
              <div className="text-sm leading-6 whitespace-pre-line">{post.content}</div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">CTA : {post.cta}</span>

                <div className="flex gap-2">
                  <CopyButton text={`${post.publicationDate}\n\n${post.title}\n\n${post.content}\n\nCTA : ${post.cta}`} />
                  {post.validationStatus === "to_validate" && (
                    <PostStatusButton validationKey={post.validationKey} action="validate" label="Valider" />
                  )}
                  {post.validationStatus !== "published" && (
                    <PostStatusButton validationKey={post.validationKey} action="publish" label="Marquer publié" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
