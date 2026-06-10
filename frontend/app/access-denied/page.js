import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Accès refusé"
          subtitle="Votre rôle actuel ne permet pas d’ouvrir cette page."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/me">Mon espace</ButtonLink>
              <ButtonLink href="/navigation">Menu autorisé</ButtonLink>
              <ButtonLink href="/session">Changer utilisateur</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-6">
          <div className="font-bold text-lg mb-2">Que faire ?</div>
          <div className="text-sm text-gray-700">
            Utilisez le menu autorisé pour accéder aux modules disponibles pour votre rôle,
            ou changez d’utilisateur depuis la page Session.
          </div>
        </div>
      </div>
    </main>
  );
}
