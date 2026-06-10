import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

export default async function AgencyDirectoryMissingPage() {

  await requireRole(["admin", "manager"]);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-5xl mx-auto">

        <PageHeader
          title="Données agences manquantes"
          subtitle="Export des champs à compléter dans le référentiel."
          action={
            <div className="flex gap-2">

              <a
                href="http://localhost:4000/agency-directory/missing/export"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Export CSV
              </a>

              <ButtonLink href="/agency-directory">
                Référentiel
              </ButtonLink>

              <ButtonLink href="/agency-directory-quality">
                Qualité
              </ButtonLink>

            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-6">

          <div className="font-bold text-lg mb-4">
            Contenu de l’export
          </div>

          <div className="space-y-3 text-sm">

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Téléphones manquants
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Emails manquants
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Liens avis Google manquants
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Liens rendez-vous manquants
            </div>

          </div>

        </div>

      </div>

    </main>
  );
}
