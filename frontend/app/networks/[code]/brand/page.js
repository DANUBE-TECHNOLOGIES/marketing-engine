import { requireRole } from "../../../lib/access";
import PageHeader from "../../../components/PageHeader";
import ButtonLink from "../../../components/ButtonLink";

async function getBrand(code) {
  const res = await fetch(`http://backend:4000/networks/${code}/brand`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur marque réseau");

  return res.json();
}

export default async function NetworkBrandPage({ params }) {
  await requireRole(["admin"]);

  const data = await getBrand(params.code);
  const brand = data.brand;

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={`Marque — ${data.network.name}`}
          subtitle="Paramètres de marque du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href={`/networks/${data.network.code}`}>Fiche réseau</ButtonLink>
              <ButtonLink href="/networks">Réseaux</ButtonLink>
            </div>
          }
        />

        {!brand ? (
          <div className="bg-white rounded-xl shadow p-6">
            Aucune configuration de marque.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold text-lg mb-4">Identité</div>
              <div className="space-y-3 text-sm">
                <div>Slogan : <strong>{brand.tagline}</strong></div>
                <div>Type : <strong>{brand.businessType}</strong></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold text-lg mb-4">Couleurs</div>
              <div className="flex gap-4">
                <div className="rounded-xl p-5 text-white" style={{ backgroundColor: brand.primaryColor }}>
                  Primary {brand.primaryColor}
                </div>
                <div className="rounded-xl p-5 text-white" style={{ backgroundColor: brand.accentColor }}>
                  Accent {brand.accentColor}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold text-lg mb-4">Modules actifs</div>
              <div className="flex flex-wrap gap-2">
                {brand.activeModules.map((module) => (
                  <span key={module} className="bg-gray-100 px-3 py-2 rounded-lg text-sm">
                    {module}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
