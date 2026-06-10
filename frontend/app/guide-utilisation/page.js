import MainLayout from "../components/MainLayout";

export default function GuideUtilisationPage() {
  return (
    <MainLayout
      title="Guide d'utilisation"
      subtitle="Mode opératoire de la plateforme Mondescale Local Engine."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-xl mb-3">1. Tous les jours</h2>
          <p>Ouvrir SEO Today pour voir les actions prioritaires, les posts à valider et les alertes réseau.</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-xl mb-3">2. Toutes les semaines</h2>
          <p>Contrôler les agences prêtes, les mots-clés suivis et l’historique des positions locales.</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-xl mb-3">3. Tous les mois</h2>
          <p>Exporter le rapport SEO mensuel, vérifier les clusters et préparer le calendrier Google Posts.</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-xl mb-3">4. Google Business</h2>
          <p>La connexion Google Business est prête, mais reste en attente de validation Google.</p>
        </div>
      </div>
    </MainLayout>
  );
}
