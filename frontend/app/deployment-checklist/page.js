import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const checklist = [
  {
    category: "Infrastructure",
    items: [
      "Ports 3000 et 4000 accessibles depuis le réseau",
      "Docker compose stable après redémarrage",
      "Sauvegarde projet créée",
      "Procédure de restauration documentée"
    ]
  },
  {
    category: "Sécurité",
    items: [
      "Accès admin limité",
      "Pages sensibles protégées par rôle",
      "Session MVP remplacée à terme par vraie authentification",
      "Exports réservés aux profils autorisés"
    ]
  },
  {
    category: "SEO local",
    items: [
      "Agences correctement renseignées",
      "Annuaires prioritaires suivis",
      "Google Posts générés",
      "Demandes d’avis configurées",
      "Scores globaux visibles"
    ]
  },
  {
    category: "API réelles",
    items: [
      "DataForSEO désactivé tant que les tests ne sont pas validés",
      "Google Business Profile à connecter",
      "Import réel des avis à brancher",
      "Publication automatique à sécuriser"
    ]
  }
];

export default async function DeploymentChecklistPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Checklist déploiement"
          subtitle="Points de contrôle avant mise en usage réelle du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/production">Production</ButtonLink>
              <ButtonLink href="/backups">Sauvegardes</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {checklist.map((section) => (
            <div key={section.category} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg mb-4">{section.category}</div>

              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item} className="bg-gray-100 rounded-lg p-3 text-sm">
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
