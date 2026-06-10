import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

const testRoutes = [
  "/",
  "/me",
  "/direction",
  "/monthly-report",
  "/global-scores",
  "/google-post-validation",
  "/review-requests",
  "/rankings",
  "/users",
  "/settings",
  "/agency-portal/1"
];

async function checkRoute(path) {
  const res = await fetch(
    `http://backend:4000/permissions/check?path=${encodeURIComponent(path)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return {
      path,
      allowed: false,
      reason: "Erreur contrôle"
    };
  }

  return res.json();
}

export default async function AccessCheckPage() {
  const results = await Promise.all(testRoutes.map((route) => checkRoute(route)));
  const user = results[0]?.user;

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Contrôle d’accès"
          subtitle={`Simulation des accès pour ${user?.name || "utilisateur"} · rôle ${user?.role || "-"}`}
          action={
            <div className="flex gap-2">
              <ButtonLink href="/permissions">Permissions</ButtonLink>
              <ButtonLink href="/session">Session</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Route</th>
                <th className="text-left p-4">Accès</th>
                <th className="text-left p-4">Raison</th>
              </tr>
            </thead>

            <tbody>
              {results.map((item) => (
                <tr key={item.path} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{item.path}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.allowed
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {item.allowed ? "Autorisé" : "Refusé"}
                    </span>
                  </td>
                  <td className="p-4">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
