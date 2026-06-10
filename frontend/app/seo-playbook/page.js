import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const sections = [
  {
    title: "Chaque jour",
    items: [
      ["Ouvrir SEO Today", "/seo-today"],
      ["Valider les posts SEO planifiés", "/seo-cluster-calendar"],
      ["Traiter les alertes réseau", "/network-notifications"]
    ]
  },
  {
    title: "Chaque semaine",
    items: [
      ["Contrôler les agences non prêtes", "/agency-directory-ready"],
      ["Corriger le référentiel", "/agency-directory-fix-plan"],
      ["Suivre les stats calendrier SEO", "/seo-cluster-calendar-stats"]
    ]
  },
  {
    title: "Chaque mois",
    items: [
      ["Exporter le rapport SEO mensuel", "/seo-monthly-report"],
      ["Préparer le calendrier du mois suivant", "/seo-cluster-calendar"],
      ["Vérifier la readiness DataForSEO", "/dataforseo-readiness"]
    ]
  }
];

export default async function SeoPlaybookPage() {
  await requireRole(["admin", "manager"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Mode opératoire SEO"
          subtitle="Procédure d’exploitation quotidienne, hebdomadaire et mensuelle."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-direction">SEO Direction</ButtonLink>
              <ButtonLink href="/seo-today">SEO Today</ButtonLink>
              <ButtonLink href="/seo-month-priorities">Priorités SEO</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg mb-4">{section.title}</div>
              <div className="space-y-3">
                {section.items.map(([label, href]) => (
                  <div key={href + label} className="bg-gray-100 rounded-lg p-3">
                    <div className="font-semibold text-sm mb-2">{label}</div>
                    <ButtonLink href={href}>Ouvrir</ButtonLink>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <div className="font-bold mb-2">Règle d’exploitation</div>
          <div className="text-sm text-gray-700">
            Le référentiel agences doit être complet avant de considérer les Google Posts,
            les demandes d’avis et les futures données DataForSEO comme fiables.
          </div>
        </div>
      </div>
    </main>
  );
}
