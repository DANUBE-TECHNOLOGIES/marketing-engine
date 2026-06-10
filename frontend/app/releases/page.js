import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const releases = [

  {
    version: "0.9.0-beta",
    items: [
      "Gestion multi-utilisateurs",
      "Permissions par rôle",
      "Portails agences",
      "Production center",
      "Audit logs",
      "Documentation interne",
      "Checklist déploiement"
    ]
  }

];

export default async function ReleasesPage() {

  await requireRole(["admin", "manager"]);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-5xl mx-auto">

        <PageHeader
          title="Release notes"
          subtitle="Historique des évolutions plateforme."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/docs">
                Documentation
              </ButtonLink>

              <ButtonLink href="/production">
                Production
              </ButtonLink>

            </div>
          }
        />

        <div className="space-y-6">

          {releases.map((release) => (

            <div
              key={release.version}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="font-bold text-lg mb-4">
                {release.version}
              </div>

              <div className="space-y-2">

                {release.items.map((item) => (

                  <div
                    key={item}
                    className="bg-gray-100 rounded-lg p-3 text-sm"
                  >
                    ✓ {item}
                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
