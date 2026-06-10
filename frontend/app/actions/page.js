import ActionsTable from "./ActionsTable";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getActions() {
  const res = await fetch("http://backend:4000/actions", { cache: "no-store" });
  if (!res.ok) throw new Error("Erreur chargement actions");
  return res.json();
}

export default async function ActionsPage() {
  const actions = await getActions();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Actions prioritaires"
          subtitle="Fiches annuaires à créer, corriger ou vérifier."
          action={<ButtonLink href="/api/actions-csv">Exporter CSV</ButtonLink>}
        />

        <ActionsTable actions={actions} />
      </div>
    </main>
  );
}
