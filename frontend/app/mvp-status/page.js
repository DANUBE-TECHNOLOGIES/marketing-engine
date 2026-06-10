import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const sections = [
  {
    title: "Fonctionnel",
    color: "green",
    items: [
      "Dashboard réseau",
      "Portails agences",
      "Google Posts",
      "Demandes d’avis",
      "Permissions utilisateurs",
      "Navigation sécurisée",
      "Production center",
      "Audit logs",
      "Exports CSV"
    ]
  },
  {
    title: "Simulation / MVP",
    color: "yellow",
    items: [
      "Sessions utilisateurs mockées",
      "Données rankings simulées",
      "Notifications réseau simulées",
      "Validation posts simulée",
      "API readiness préparé"
    ]
  },
  {
    title: "À connecter plus tard",
    color: "red",
    items: [
      "Google Business Profile API",
      "DataForSEO réel",
      "WhatsApp Business",
      "Emails automatiques",
      "Publication Google réelle",
      "Import réel des avis Google"
    ]
  }
];

function sectionClass(color) {

  if (color === "green") {
    return "bg-green-100 text-green-800";
  }

  if (color === "yellow") {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-red-100 text-red-800";
}

export default async function MvpStatusPage() {

  await requireRole(["admin", "manager"]);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="MVP Status"
          subtitle="État réel de Mondescale Local Engine."
          action={
            <div className="flex gap-2">

              <ButtonLink href="/production">
                Production
              </ButtonLink>

              <ButtonLink href="/admin-network">
                Admin réseau
              </ButtonLink>

            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {sections.map((section) => (

            <div
              key={section.title}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className={`inline-block text-xs px-3 py-1 rounded mb-4 ${sectionClass(section.color)}`}>
                {section.title}
              </div>

              <div className="space-y-3">

                {section.items.map((item) => (

                  <div
                    key={item}
                    className="bg-gray-100 rounded-lg p-3 text-sm"
                  >
                    {item}
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
