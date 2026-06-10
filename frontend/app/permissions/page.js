import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getPermissions() {
  const res = await fetch("http://backend:4000/permissions", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur permissions");

  return res.json();
}

export default async function PermissionsPage() {
  const data = await getPermissions();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Permissions"
          subtitle={`Accès autorisés pour ${data.user.name} · rôle ${data.role}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/session">Session</ButtonLink>
              <ButtonLink href="/me">Mon espace</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-5">
          <div className="font-bold text-lg mb-4">Routes autorisées</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.allowedRoutes.map((route) => (
              <div key={route} className="bg-gray-100 rounded-lg p-3 text-sm">
                {route}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
