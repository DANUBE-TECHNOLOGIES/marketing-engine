import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";

async function getPosts() {
  const res = await fetch("http://backend:4000/agency-directory-google-posts", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur Google Posts agences");

  return res.json();
}

export default async function AgencyGooglePostsPage() {
  await requireRole(["admin", "manager"]);

  const data = await getPosts();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Google Posts agences"
          subtitle="Posts enrichis avec les données réelles du référentiel agences."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel agences</ButtonLink>
              <ButtonLink href="/google-posts">Google Posts classiques</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.posts.map((post, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">{post.agencyName}</div>
                  <div className="text-sm text-gray-500">{post.city} · {post.phone}</div>
                </div>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded h-fit">
                  {post.theme}
                </span>
              </div>

              <div className="font-semibold mb-2">{post.title}</div>
              <div className="text-sm whitespace-pre-line leading-6">{post.content}</div>

              <div className="mt-4 flex justify-between items-center gap-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  CTA : {post.cta}
                </span>
                <CopyButton text={`${post.title}\n\n${post.content}\n\nCTA : ${post.cta}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
