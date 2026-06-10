import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

export default async function PlatformCheckPage() {

  await requireRole(["admin"]);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="Platform check"
          subtitle="Procédure de vérification globale de la plateforme."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/production">
                Production
              </ButtonLink>

              <ButtonLink href="/docs">
                Documentation
              </ButtonLink>

            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-5 mb-6">

          <div className="font-bold text-lg mb-4">
            Commande de vérification
          </div>

          <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-auto">
{`cd ~/mondescale-local-engine

./scripts/check-platform.sh`}
          </pre>

        </div>

        <div className="bg-white rounded-xl shadow p-5">

          <div className="font-bold text-lg mb-4">
            Vérifications effectuées
          </div>

          <div className="space-y-3 text-sm">

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Containers Docker
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Backend health
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Frontend access
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Routes critiques
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Ports exposés
            </div>

            <div className="bg-gray-100 rounded-lg p-3">
              ✓ Syntaxe backend
            </div>

          </div>

        </div>

      </div>

    </main>
  );
}
