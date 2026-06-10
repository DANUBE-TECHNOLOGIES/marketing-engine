import PageHeader from "../../components/PageHeader";
import NewReviewRequestForm from "./NewReviewRequestForm";

async function getAgencies() {
  const res = await fetch("http://backend:4000/agencies", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement agences");

  return res.json();
}

export default async function NewReviewRequestPage() {
  const agencies = await getAgencies();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Nouvelle demande d’avis"
          subtitle="Génère un message prêt à envoyer au client."
        />

        <NewReviewRequestForm agencies={agencies} />
      </div>
    </main>
  );
}
