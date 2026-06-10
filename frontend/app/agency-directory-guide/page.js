import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

export default async function AgencyDirectoryGuidePage() {
  await requireRole(["admin", "manager"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Guide ajout agence"
          subtitle="Procédure pour ajouter une agence dans le référentiel central."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel</ButtonLink>
              <ButtonLink href="/agency-directory-quality">Qualité</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-3">1. Modifier le fichier</div>
            <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`nano backend/src/data/agencyDirectory.js`}
            </pre>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-3">2. Ajouter une agence</div>
            <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`{
  id: 3,
  code: "nevers",
  name: "Mondescale Nevers",
  city: "Nevers",
  phone: "00 00 00 00 00",
  email: "nevers@mondescale.com",
  googleReviewUrl: "https://g.page/r/XXXXX/review",
  appointmentUrl: "https://s01.o2switch.cloud/apps/calendar/appointment/XXXXX",
  facebook: "https://facebook.com/mondescale",
  instagram: "https://instagram.com/mondescalevoyages",
  category: "Agence de voyages",
  active: true
}`}
            </pre>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-3">3. Vérifier</div>
            <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`./scripts/check-agency-directory.sh

docker compose restart backend`}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
