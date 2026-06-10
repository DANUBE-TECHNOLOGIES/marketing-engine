import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getCalendar() {
  const res = await fetch("http://backend:4000/google-posts/calendar", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement calendrier");

  return res.json();
}

export default async function GooglePostsCalendarPage() {
  const posts = await getCalendar();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Calendrier Google Posts"
          subtitle="Planning des publications par agence."
          action={<ButtonLink href="/google-posts/new">Nouveau post</ButtonLink>}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow p-5">
              <p className="text-sm text-gray-500">
                {post.plannedAt
                  ? new Date(post.plannedAt).toLocaleDateString("fr-FR")
                  : "Sans date"}
              </p>

              <h2 className="font-bold mt-2">{post.title}</h2>

              <p className="text-sm text-gray-600 mt-2">
                {post.agencyName} — {post.city}
              </p>

              <p className="text-sm mt-3">
                Statut : <strong>{post.status}</strong>
              </p>

              <div className="mt-4">
                <ButtonLink href={`/google-posts/${post.id}`}>
                  Voir
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            Aucun post planifié.
          </div>
        )}
      </div>
    </main>
  );
}
