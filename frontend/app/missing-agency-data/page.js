import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

export default async function MissingAgencyDataPage() {
  await requireRole(["admin", "manager"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Données agences manquantes"
          subtitle="Commande pour identifier les téléphones, emails, liens avis et liens RDV à compléter."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
              <ButtonLink href="/agency-directory-quality">Qualité</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-3">Commande</div>
          <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`cd ~/mondescale-local-engine

./scripts/missing-agency-data.sh`}
          </pre>
        </div>
      </div>
    </main>
  );
}
