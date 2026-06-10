import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import NotificationActions from "./NotificationActions";

async function getNotifications() {
  const res = await fetch("http://backend:4000/notifications", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement notifications");

  return res.json();
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  const open = notifications.filter((n) => n.status === "open");

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Notifications"
          subtitle="Alertes persistantes du réseau à traiter."
          action={<ButtonLink href="/direction/alerts">Voir alertes live</ButtonLink>}
        />

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left p-4">Statut</th>
                <th className="text-left p-4">Priorité</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Agence</th>
                <th className="text-left p-4">Message</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {open.map((n) => (
                <tr key={n.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{n.status}</td>
                  <td className="p-4">{n.level}</td>
                  <td className="p-4">{n.type}</td>
                  <td className="p-4 font-semibold">
                    {n.agency?.name || "-"}
                    <div className="text-xs text-gray-500">{n.agency?.city}</div>
                  </td>
                  <td className="p-4">{n.message}</td>
                  <td className="p-4">
                    <NotificationActions id={n.id} link={n.link} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {open.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Aucune notification ouverte.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
