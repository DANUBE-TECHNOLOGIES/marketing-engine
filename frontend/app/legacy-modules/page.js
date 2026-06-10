import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const modules = [
  ["Rankings simulés", "/rankings"],
  ["DataForSEO test", "/dataforseo"],
  ["Roadmap produit", "/roadmap"],
  ["Réseaux multi-SaaS", "/networks"],
  ["Release notes", "/releases"],
  ["Access check", "/access-check"]
];

export default async function LegacyModulesPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Archives / modules simulés"
          subtitle="Modules conservés mais non prioritaires pour l’exploitation Mondescale actuelle."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
              <ButtonLink href="/seo-direction">SEO Direction</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(([label, href]) => (
            <div key={href} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold mb-2">{label}</div>
              <div className="text-sm text-gray-500 mb-4">{href}</div>
              <ButtonLink href={href}>Ouvrir</ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
