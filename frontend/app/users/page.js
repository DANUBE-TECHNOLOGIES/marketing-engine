import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ButtonLink from "../components/ButtonLink";

async function getUsers() {
  const res = await fetch("http://backend:4000/users", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement utilisateurs");

  return res.json();
}

function roleClass(role) {
  if (role === "admin") return "bg-red-100 text-red-800";
  if (role === "manager") return "bg-blue-100 text-blue-800";
  return "bg-green-100 text-green-800";
}

export default async function UsersPage() {
  await requireRole(["admin"]);
  const data = await getUsers();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Utilisateurs"
          subtitle="Préparation de la gestion multi-utilisateurs et des accès par agence."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/users/roles">Rôles</ButtonLink>
              <ButtonLink href="/settings">Configuration</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Utilisateurs" value={data.total} />
          <StatCard label="Admins" value={data.admins} />
          <StatCard label="Managers" value={data.managers} />
          <StatCard label="Agences" value={data.agencies} />
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Nom</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Rôle</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${roleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">{user.agencyName}</td>
                  <td className="p-4">{user.agencyId ? <ButtonLink href={`/agency-portal/${user.agencyId}`}>Voir portail</ButtonLink> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
