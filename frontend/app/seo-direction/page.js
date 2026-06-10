import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const blocks = [
  {
    title: "Pilotage quotidien",
    links: [
      ["SEO Today", "/seo-today"],
      ["Notifications", "/network-notifications"],
      ["Production", "/production"]
    ]
  },
  {
    title: "Contenus SEO",
    links: [
      ["Calendrier SEO", "/seo-cluster-calendar"],
      ["Stats calendrier", "/seo-cluster-calendar-stats"],
      ["Posts clusters", "/seo-cluster-google-posts"],
      ["Clusters SEO", "/seo-keyword-clusters"],
      ["Keywords DB", "/seo-keywords-db"]
    ]
  },
  {
    title: "Référentiel agences",
    links: [
      ["Agences prêtes", "/agency-directory-ready"],
      ["Qualité référentiel", "/agency-directory-quality"],
      ["Plan correction", "/agency-directory-fix-plan"],
      ["Référentiel", "/agency-directory"]
    ]
  },
  {
    title: "Reporting",
    links: [
      ["Rapport SEO mensuel", "/seo-monthly-report"],
      ["Rapport mensuel global", "/monthly-report"],
      ["Scores globaux", "/global-scores"],
      ["Actions globales", "/global-actions"]
    ]
  }
];

export default async function SeoDirectionPage() {
  await requireRole(["admin", "manager"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="SEO Direction"
          subtitle="Tableau de bord de pilotage SEO local Mondescale."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/seo-monthly-report">Rapport SEO</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
              <ButtonLink href="/dataforseo-status">DataForSEO réel</ButtonLink>
              <ButtonLink href="/google-business-mapping">Mapping Google</ButtonLink>
              <ButtonLink href="/seo-playbook">Mode opératoire SEO</ButtonLink>
              <ButtonLink href="/">Accueil</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blocks.map((block) => (
            <div key={block.title} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg mb-4">{block.title}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {block.links.map(([label, href]) => (
                  <ButtonLink key={href} href={href}>
                    {label}
                  </ButtonLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
