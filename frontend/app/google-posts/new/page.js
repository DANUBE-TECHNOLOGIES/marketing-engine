import PageHeader from "../../components/PageHeader";
import NewGooglePostForm from "./NewGooglePostForm";

async function getAgencies() {
  const res = await fetch("http://backend:4000/agencies", {
    cache: "no-store"
  });

  return res.json();
}

export default async function NewGooglePostPage() {
  const agencies = await getAgencies();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Nouveau Google Post"
          subtitle="Créer un post prêt à publier sur Google Business Profile."
        />

        <NewGooglePostForm agencies={agencies} />
      </div>
    </main>
  );
}
