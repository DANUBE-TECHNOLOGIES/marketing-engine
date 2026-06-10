import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const sections = [
  {
    title: "Déjà opérationnel",
    items: [
      "Dashboard réseau SEO local",
      "Suivi citations / annuaires",
      "Google Posts générés",
      "Calendrier éditorial",
      "Validation Direction",
      "Demandes d’avis",
      "Scores globaux",
      "Rankings simulés",
      "Rapport mensuel",
      "Centre IA SEO"
    ]
  },
  {
    title: "Encore simulé",
    items: [
      "Positions Google locales",
      "Import réel des avis Google",
      "Publication automatique Google Posts",
      "Connexion Google Business Profile",
      "Historique réel mois par mois"
    ]
  },
  {
    title: "Prochaines connexions réelles",
    items: [
      "API Google Business Profile",
      "Import avis clients",
      "Export planning posts",
      "Vérification annuaires semi-automatique",
      "Connexion email / WhatsApp pour demandes d’avis"
    ]
  }
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Roadmap produit"
          subtitle="État d’avancement de la solution SEO locale Mondescale."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/settings">Configuration</ButtonLink>
              <ButtonLink href="/users">Utilisateurs</ButtonLink>
              <ButtonLink href="/system-health">Système</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg mb-4">{section.title}</div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="bg-gray-100 rounded-lg p-3 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-xl shadow p-5">
          <div className="font-bold mb-2">Lecture</div>
          <div className="text-sm text-gray-700">
            Cette page sert de point de contrôle pour distinguer le MVP fonctionnel,
            les données simulées et les futures intégrations réelles.
          </div>
        </div>
      </div>
    </main>
  );
}
