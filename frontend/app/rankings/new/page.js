import PageHeader from "../../components/PageHeader";
import NewKeywordForm from "./NewKeywordForm";

async function getAgencies() {
  const res = await fetch("http://backend:4000/agencies", {
    cache: "no-store"
  });

  return res.json();
}

export default async function NewKeywordPage() {
  const agencies = await getAgencies();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Ajouter un mot-clé"
          subtitle="Suivi du référencement local."
        />

        <NewKeywordForm agencies={agencies} />
      </div>
    </main>
  );
}
