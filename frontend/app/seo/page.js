import MainLayout from "../components/MainLayout";

const sections = [
  {
    title: "Pilotage réseau",
    items: [
      {
        label: "SEO Dashboard",
        href: "/seo-dashboard",
        description: "Vue globale des scores SEO par agence."
      },
      {
        label: "SEO Ranking",
        href: "/seo-ranking",
        description: "Classement réseau, progressions et régressions."
      },
      {
        label: "SEO Actions",
        href: "/seo-actions",
        description: "Actions prioritaires à réaliser par Sylvie."
      },
      {
        label: "Rapport SEO quotidien",
        href: "/seo-report",
        description: "Synthèse direction du jour."
      },
      {
        label: "Historique rapports",
        href: "/seo-report-history",
        description: "Archives quotidiennes des rapports SEO."
      }
    ]
  },
  {
    title: "Google",
    items: [
      {
        label: "Google Posts",
        href: "/google-posts",
        description: "Création, validation et suivi des posts Google."
      },
      {
        label: "Validation Posts",
        href: "/google-post-validation",
        description: "Contrôle éditorial avant publication."
      },
      {
        label: "Calendrier Posts",
        href: "/google-post-calendar",
        description: "Planification et rythme de publication."
      },
      {
        label: "Avis Google",
        href: "/reviews-dashboard",
        description: "Suivi des avis, réponses IA et demandes d’avis."
      },
      {
        label: "Réponses IA Avis",
        href: "/reviews-ai",
        description: "Génération et validation des réponses."
      }
    ]
  },
  {
    title: "Citations locales",
    items: [
      {
        label: "Dashboard Citations",
        href: "/directories-dashboard",
        description: "Score annuaires et visibilité locale."
      },
      {
        label: "Priorité Citations",
        href: "/directories-priority",
        description: "Worklist priorisée par impact SEO."
      },
      {
        label: "Worklist Citations",
        href: "/directories-worklist",
        description: "Annuaires à créer ou vérifier."
      }
    ]
  },
  {
    title: "Automatisation",
    items: [
      {
        label: "Automation Dashboard",
        href: "/automation-dashboard",
        description: "Actions générées automatiquement."
      },
      {
        label: "Logs automation",
        href: "/automation-logs",
        description: "Suivi du cron quotidien et derniers logs."
      },
      {
        label: "Email SEO",
        href: "/seo-email",
        description: "Prévisualisation et test du rapport email."
      }
    ]
  }
];

export default function Page() {
  return (
    <MainLayout
      title="SEO Local Engine"
      subtitle="Portail de pilotage SEO réseau Mondescale"
    >
      <div className="grid grid-cols-4 gap-4 mb-8">
        <a href="/seo-dashboard" className="bg-white rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Pilotage</div>
          <div className="text-2xl font-bold mt-1">Dashboard</div>
        </a>

        <a href="/seo-ranking" className="bg-white rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Classement</div>
          <div className="text-2xl font-bold mt-1">Ranking</div>
        </a>

        <a href="/seo-actions" className="bg-white rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Opérationnel</div>
          <div className="text-2xl font-bold mt-1">Actions</div>
        </a>

        <a href="/automation-dashboard" className="bg-white rounded-2xl shadow p-5 block">
          <div className="text-sm text-gray-500">Automatisation</div>
          <div className="text-2xl font-bold mt-1">Daily Run</div>
        </a>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-5">
              {section.title}
            </h2>

            <div className="grid grid-cols-3 gap-4">
              {section.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="border rounded-2xl p-5 hover:bg-slate-50 block"
                >
                  <div className="font-bold text-lg">
                    {item.label}
                  </div>

                  <div className="text-sm text-gray-600 mt-2">
                    {item.description}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
