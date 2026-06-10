import NewReviewForm from "./NewReviewForm";
import PageHeader from "../../components/PageHeader";

async function getAgencies() {
  const res = await fetch("http://backend:4000/agencies", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement agences");

  return res.json();
}

export default async function NewReviewPage() {
  const agencies = await getAgencies();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Ajouter un avis"
          subtitle="Ajout manuel d’un avis Google pour test ou suivi."
        />

        <NewReviewForm agencies={agencies} />
      </div>
    </main>
  );
}
