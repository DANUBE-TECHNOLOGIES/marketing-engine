import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getSession() {
  const res = await fetch("http://backend:4000/session", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur session");

  return res.json();
}

async function getUsers() {
  const res = await fetch("http://backend:4000/users", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur utilisateurs");

  return res.json();
}

function roleClass(role) {
  if (role === "admin") return "bg-red-100 text-red-800";
  if (role === "manager") return "bg-blue-100 text-blue-800";
  return "bg-green-100 text-green-800";
}

export default async function SessionPage() {
  const session = await getSession();
  const users = await getUsers();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <div className="max-w-6xl mx-auto">

        <PageHeader
          title="Session utilisateur"
          subtitle="Simulation du futur système de connexion."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/users">Utilisateurs</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="font-bold text-lg mb-4">
            Utilisateur connecté
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="font-semibold">
                {session.currentUser.name}
              </div>

              <div className="text-sm text-gray-500">
                {session.currentUser.email}
              </div>
            </div>

            <span className={`text-xs px-2 py-1 rounded ${roleClass(session.currentUser.role)}`}>
              {session.currentUser.role}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">

            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Nom</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Rôle</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Connexion</th>
              </tr>
            </thead>

            <tbody>
              {users.users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">

                  <td className="p-4 font-semibold">
                    {user.name}
                  </td>

                  <td className="p-4">
                    {user.email}
                  </td>

                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${roleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="p-4">
                    {user.agencyName}
                  </td>

                  <td className="p-4">
                    <form
                      action={`http://localhost:4000/session/login/${user.id}`}
                      method="post"
                    >
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
                      >
                        Se connecter
                      </button>
                    </form>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

    </main>
  );
}
