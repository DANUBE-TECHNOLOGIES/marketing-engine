import { requireRole } from "../../lib/access";

import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getAgency(code) {

  const res = await fetch(
    `http://backend:4000/agency-directory/${code}`,
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur agence");
  }

  return res.json();
}

export default async function AgencyDirectoryDetailPage({
  params
}) {

  await requireRole(["admin", "manager"]);

  const agency = await getAgency(params.code);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-5xl mx-auto">

        <PageHeader
          title={agency.name}
          subtitle="Référentiel agence"
          action={
            <div className="flex gap-2">

              <ButtonLink href="/agency-directory">
                Référentiel
              </ButtonLink>

              <ButtonLink href={`/agency-portal/${agency.id}`}>
                Portail agence
              </ButtonLink>

            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-xl shadow p-5 border">

            <div className="font-bold text-lg mb-4">
              Informations
            </div>

            <div className="space-y-3 text-sm">

              <div>
                Ville : <strong>{agency.city}</strong>
              </div>

              <div>
                Téléphone : <strong>{agency.phone}</strong>
              </div>

              <div>
                Email : <strong>{agency.email}</strong>
              </div>

              <div>
                Catégorie GBP : <strong>{agency.category}</strong>
              </div>

            </div>

          </div>

          <div className="bg-white rounded-xl shadow p-5 border">

            <div className="font-bold text-lg mb-4">
              Liens
            </div>

            <div className="space-y-3">

              <a
                href={agency.googleReviewUrl}
                target="_blank"
                className="block bg-gray-100 rounded-lg p-3 text-sm"
              >
                Avis Google
              </a>

              <a
                href={agency.appointmentUrl}
                target="_blank"
                className="block bg-gray-100 rounded-lg p-3 text-sm"
              >
                Prise de rendez-vous
              </a>

              <a
                href={agency.facebook}
                target="_blank"
                className="block bg-gray-100 rounded-lg p-3 text-sm"
              >
                Facebook
              </a>

              <a
                href={agency.instagram}
                target="_blank"
                className="block bg-gray-100 rounded-lg p-3 text-sm"
              >
                Instagram
              </a>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}
