import PageHeader from "../../components/PageHeader";
import GooglePostActions from "./GooglePostActions";

async function getPost(id) {
  const res = await fetch("http://backend:4000/google-posts", {
    cache: "no-store"
  });

  const posts = await res.json();
  return posts.find((p) => p.id === Number(id));
}

export default async function GooglePostDetailPage({ params }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.id);

  if (!post) {
    return <main className="p-8">Post introuvable</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={post.title}
          subtitle={`${post.agency.name} — ${post.status}`}
        />

        <div className="bg-white rounded-xl shadow p-6 space-y-5">
          <pre className="whitespace-pre-wrap bg-gray-100 rounded-lg p-5 text-sm">
            {post.content}
          </pre>

          <div className="text-sm text-gray-600">
            CTA : {post.ctaLabel || "-"}<br />
            Lien : {post.ctaUrl || "-"}
          </div>

          <GooglePostActions id={post.id} content={post.content} />
        </div>
      </div>
    </main>
  );
}
