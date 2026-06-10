import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getStatus() {
  const res = await fetch("http://backend:4000/dataforseo-status", {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Erreur DataForSEO");
  }

  return res.json();
}

export default async function DataForSeoStatusPage() {
  await requireRole(["admin", "manager"]);

  const data = await getStatus();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="DataForSEO"
          subtitle="Préparation de l’intégration réelle."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-direction">
                SEO Direction
              </ButtonLink>

              <ButtonLink href="/google-business-status">
                Google Business
              </ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

          <StatCard
            label="API activée"
            value={data.enabled ? "Oui" : "Non"}
          />

          <StatCard
            label="Identifiants"
            value={data.credentialsConfigured ? "OK" : "KO"}
          />

          <StatCard
            label="Agences prêtes"
            value={`${data.agenciesReady}/${data.totalAgencies}`}
          />

          <StatCard
            label="Endpoint"
            value="OK"
          />

        </div>

        <div className="bg-white rounded-xl shadow p-6">

          <div className="font-bold mb-4">
            Endpoints configurés
          </div>

          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
{JSON.stringify(data.endpoints, null, 2)}
          </pre>

        </div>

      </div>
    </main>
  );
}
