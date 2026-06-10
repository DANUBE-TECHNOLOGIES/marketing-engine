import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getProduction() {

  const res = await fetch(
    "http://backend:4000/production-status",
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur production");
  }

  return res.json();
}

function statusClass(status) {

  if (status === "ready") {
    return "bg-green-100 text-green-800";
  }

  if (status === "pending") {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-red-100 text-red-800";
}

export default async function ProductionPage() {

  await requireRole(["admin", "manager"]);

  const data = await getProduction();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Production Center"
          subtitle="État global de préparation de Mondescale Local Engine."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/admin-network">
                Admin réseau
              </ButtonLink>

              <ButtonLink href="/">
                Accueil
              </ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

          <StatCard
            label="Agences"
            value={data.network.agencies}
          />

          <StatCard
            label="Citation moyenne"
            value={`${data.network.averageCitation}%`}
          />

          <StatCard
            label="Priorités hautes"
            value={data.network.highPriority}
          />

          <StatCard
            label="Onboarding"
            value={`${data.network.onboardingAverage}%`}
          />

          <StatCard
            label="Référentiel agences"
            value={`${data.directory.configuredAgencies}/${data.directory.expectedAgencies}`}
          />

          <StatCard
            label="Complétion référentiel"
            value={`${data.directory.completionRate}%`}
          />

          <StatCard
            label="Agences prêtes"
            value={`${data.directory.readyAgencies}/${data.directory.configuredAgencies}`}
          />

        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">

          <div className="font-bold text-lg mb-4">
            État des modules
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {data.modules.map((module) => (

              <div
                key={module.name}
                className="border rounded-lg p-4"
              >

                <div className="flex justify-between items-center">

                  <div className="font-semibold">
                    {module.name}
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded ${statusClass(module.status)}`}
                  >
                    {module.status}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </div>

        <div className="bg-white rounded-xl shadow p-5">

          <div className="font-bold text-lg mb-4">
            Alertes réseau
          </div>

          <div className="space-y-3">

            {data.alerts.map((alert, index) => (

              <div
                key={index}
                className="border rounded-lg p-4"
              >

                <div className="font-semibold">
                  {alert.title}
                </div>

                <div className="text-sm text-gray-700 mt-2">
                  {alert.message}
                </div>

              </div>

            ))}

            {data.alerts.length === 0 && (
              <div className="text-sm text-gray-500">
                Aucune alerte.
              </div>
            )}

          </div>

        </div>

      </div>

    </main>
  );
}
