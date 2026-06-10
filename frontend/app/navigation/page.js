import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getNavigation() {
  const res = await fetch("http://backend:4000/navigation", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur navigation");

  return res.json();
}

export default async function NavigationPage() {
  const data = await getNavigation();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Navigation autorisée"
          subtitle={`Menu visible pour ${data.user.name} · rôle ${data.user.role}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/session">Session</ButtonLink>
              <ButtonLink href="/access-check">Contrôle accès</ButtonLink>
              <ButtonLink href="/me">Mon espace</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.items.map((item) => (
            <div key={item.href} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold mb-2">{item.label}</div>
              <div className="text-sm text-gray-500 mb-4">{item.href}</div>
              <ButtonLink href={item.href}>Ouvrir</ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
