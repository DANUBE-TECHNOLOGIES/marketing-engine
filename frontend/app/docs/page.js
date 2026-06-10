import { requireRole } from "../lib/access";

import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const docs = [

  {
    title: "Production",
    href: "/production"
  },

  {
    title: "Sauvegardes",
    href: "/backups"
  },

  {
    title: "Checklist déploiement",
    href: "/deployment-checklist"
  },

  {
    title: "Onboarding agences",
    href: "/agency-onboarding"
  },

  {
    title: "API readiness",
    href: "/api-readiness"
  }

];

export default async function DocsPage() {

  await requireRole(["admin", "manager"]);

  return (

    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="Documentation"
          subtitle="Centre documentaire interne."
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {docs.map((doc) => (

            <div
              key={doc.href}
              className="bg-white rounded-xl shadow p-5 border"
            >

              <div className="font-bold mb-4">
                {doc.title}
              </div>

              <ButtonLink href={doc.href}>
                Ouvrir
              </ButtonLink>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
