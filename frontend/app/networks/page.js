import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getNetworks() {

  const res = await fetch(
    "http://backend:4000/networks",
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Erreur réseaux");
  }

  return res.json();
}

export default async function NetworksPage() {

  await requireRole(["admin"]);

  const data = await getNetworks();

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="Réseaux"
          subtitle="Préparation multi-réseaux."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/admin-network">
                Admin réseau
              </ButtonLink>

              <ButtonLink href="/production">
                Production
              </ButtonLink>

            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {data.networks.map((network) => (

            <div
              key={network.id}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="flex justify-between items-center mb-4">

                <div className="font-bold text-lg">
                  {network.name}
                </div>

                <span className={`text-xs px-2 py-1 rounded ${
                  network.active
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {network.active ? "Actif" : "Préparation"}
                </span>

              </div>

              <div className="mb-4"><ButtonLink href={`/networks/${network.code}`}>Ouvrir</ButtonLink></div>

              <div className="space-y-2 text-sm">

                <div>
                  Code : <strong>{network.code}</strong>
                </div>

                <div>
                  Agences : <strong>{network.agencies}</strong>
                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
