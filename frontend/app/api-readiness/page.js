import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getApis() {

  const res = await fetch(
    "http://backend:4000/api-readiness",
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API readiness");
  }

  return res.json();
}

function status(value) {
  return value ? "Oui" : "Non";
}

export default async function ApiReadinessPage() {

  await requireRole(["admin"]);

  const data = await getApis();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-5xl mx-auto">

        <PageHeader
          title="API readiness"
          subtitle="Préparation des intégrations réelles."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/production">
                Production
              </ButtonLink>

              <ButtonLink href="/system-health">
                Système
              </ButtonLink>

            </div>
          }
        />

        <div className="space-y-4">

          {Object.entries(data).map(([name, item]) => (

            <div
              key={name}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="font-bold text-lg mb-3">
                {name}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">

                <div>
                  Ready : <strong>{status(item.ready)}</strong>
                </div>

                <div>
                  Connected : <strong>{status(item.connected)}</strong>
                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
