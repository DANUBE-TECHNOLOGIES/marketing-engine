import PageHeader from "../../components/PageHeader";
import ButtonLink from "../../components/ButtonLink";

async function getRoles() {
  const res = await fetch("http://backend:4000/users/roles", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement rôles");

  return res.json();
}

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Rôles & permissions"
          subtitle="Définition des futurs droits d’accès."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/users">Utilisateurs</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.role} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg mb-2">{role.label}</div>
              <div className="text-sm text-gray-500 mb-4">{role.role}</div>

              <div className="space-y-2">
                {role.permissions.map((permission) => (
                  <div key={permission} className="bg-gray-100 rounded-lg p-3 text-sm">
                    {permission}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
