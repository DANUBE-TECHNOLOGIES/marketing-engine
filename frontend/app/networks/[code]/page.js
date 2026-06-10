import { requireRole } from "../../lib/access";
import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getNetwork(code) {
  const res = await fetch(`http://backend:4000/networks/${code}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur fiche réseau");

  return res.json();
}

export default async function NetworkDetailPage({ params }) {
  await requireRole(["admin"]);

  const network = await getNetwork(params.code);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={network.name}
          subtitle={`Code réseau : ${network.code}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/networks">Réseaux</ButtonLink>
              <ButtonLink href={`/networks/${network.code}/brand`}>Marque réseau</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Agences</div>
            <div className="text-3xl font-bold">{network.agencies}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Statut</div>
            <div className="text-3xl font-bold">
              {network.active ? "Actif" : "Préparation"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Modules</div>
            <div className="text-3xl font-bold">{network.modules.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Modules prévus</div>
            <div className="space-y-2">
              {network.modules.map((item) => (
                <div key={item} className="bg-gray-100 rounded-lg p-3 text-sm">
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="font-bold text-lg mb-4">Prochaines étapes</div>
            <div className="space-y-2">
              {network.nextSteps.map((item) => (
                <div key={item} className="bg-gray-100 rounded-lg p-3 text-sm">
                  → {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
