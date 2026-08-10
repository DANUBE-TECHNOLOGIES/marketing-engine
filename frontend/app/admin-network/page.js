import MainLayout from "../components/MainLayout";
import Link from "next/link";

const sections = [
  {
    title: "Pilotage",
    links: [
      ["SEO Direction", "/seo-direction"],
      ["SEO Today", "/seo-today"],
      ["Production", "/production"],
      ["Mise en ligne mini-sites", "/agency-launch"],
      ["Studio éditorial Inspirations", "/editorial-content"]
    ]
  },
  {
    title: "SEO local",
    links: [
      ["Keywords DB", "/seo-keywords-db"],
      ["Historique positions", "/rankings-history"],
      ["Clusters SEO", "/seo-keyword-clusters"],
      ["Calendrier SEO", "/seo-cluster-calendar"]
    ]
  },
  {
    title: "Google & Data",
    links: [
      ["Google Business", "/google-business-status"],
      ["Mapping Google", "/google-business-mapping"],
      ["DataForSEO", "/dataforseo-status"],
      ["Preview DataForSEO", "/dataforseo-preview"]
    ]
  },
  {
    title: "Administration",
    links: [
      ["Agences", "/agency-directory"],
      ["Agences prêtes", "/agency-directory-ready"],
      ["Maintenance", "/maintenance"],
      ["Guide", "/guide-utilisation"]
    ]
  }
];

export default function AdminNetworkPage() {
  return (
    <MainLayout
      title="Admin réseau"
      subtitle="Menu simplifié de la plateforme Mondescale Local Engine."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-xl mb-4">{section.title}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-[#f4f8fb] rounded-xl p-4 hover:bg-[#42c7cc] hover:text-[#073653] transition"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
