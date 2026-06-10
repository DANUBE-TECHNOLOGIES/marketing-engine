import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getSettings() {
  const res = await fetch("http://backend:4000/settings", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement configuration");

  return res.json();
}

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const settings = await getSettings();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Configuration"
          subtitle="Paramètres de pilotage SEO local du réseau."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/system-health">Système</ButtonLink>
              <a href="http://localhost:4000/settings/export" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Export CSV</a>
              <ButtonLink href="/roadmap">Roadmap</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Objectif avis / mois" value={settings.monthlyReviewTarget} />
          <StatCard label="Objectif posts / mois" value={settings.monthlyPostTarget} />
          <StatCard label="Mots-clés suivis" value={settings.trackedKeywords.length} />
          <StatCard label="Statut" value={settings.status} />
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="font-bold text-lg mb-4">Pondération du score global</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-500">Citations</div>
              <div className="text-2xl font-bold">{settings.scoreWeights.citations}%</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-500">Google Posts</div>
              <div className="text-2xl font-bold">{settings.scoreWeights.googlePosts}%</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-500">Avis</div>
              <div className="text-2xl font-bold">{settings.scoreWeights.reviews}%</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-500">Rankings</div>
              <div className="text-2xl font-bold">{settings.scoreWeights.rankings}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-4">Mots-clés suivis</div>
          <div className="flex flex-wrap gap-2">
            {settings.trackedKeywords.map((keyword) => (
              <span key={keyword} className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
