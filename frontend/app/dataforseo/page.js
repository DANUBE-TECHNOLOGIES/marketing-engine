import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getStatus() {
  const res = await fetch("http://backend:4000/dataforseo/status", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur statut DataForSEO");

  return res.json();
}

async function getMapsTest() {
  const res = await fetch("http://backend:4000/dataforseo/maps-test", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur test DataForSEO Maps");

  return res.json();
}

export default async function DataForSeoPage() {
  await requireRole(["admin"]);

  const status = await getStatus();
  const test = await getMapsTest();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="DataForSEO"
          subtitle="Connexion protégée pour les positions locales réelles."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/rankings">Rankings</ButtonLink>
              <ButtonLink href="/roadmap">Roadmap</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Statut connexion</div>
            <div className="space-y-3 text-sm">
              <div>Activé : <strong>{status.enabled ? "Oui" : "Non"}</strong></div>
              <div>Configuré : <strong>{status.configured ? "Oui" : "Non"}</strong></div>
              <div>Login présent : <strong>{status.loginPresent ? "Oui" : "Non"}</strong></div>
              <div>Mot de passe présent : <strong>{status.passwordPresent ? "Oui" : "Non"}</strong></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Test Maps</div>
            <div className="space-y-3 text-sm">
              <div>Mot-clé : <strong>{test.keyword}</strong></div>
              <div>Localisation : <strong>{test.locationName}</strong></div>
              <div>Mode réel : <strong>{test.enabled ? "Oui" : "Non"}</strong></div>
            </div>

            {!test.enabled && (
              <div className="mt-5 bg-yellow-100 text-yellow-800 rounded-lg p-4 text-sm">
                DataForSEO est désactivé : aucun crédit consommé.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-4">Prochaine étape</div>
          <div className="text-sm text-gray-700">
            Quand les identifiants seront configurés et que DATAFORSEO_ENABLED=true,
            cette page permettra de tester une vraie requête Google Maps locale.
          </div>
        </div>
      </div>
    </main>
  );
}
