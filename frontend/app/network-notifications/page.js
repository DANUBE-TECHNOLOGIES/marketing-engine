import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";

async function getNotifications() {
  const res = await fetch("http://backend:4000/network-notifications", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur chargement notifications réseau");

  return res.json();
}

function priorityClass(priority) {
  if (priority === "critical") return "bg-red-100 text-red-800";
  if (priority === "high") return "bg-orange-100 text-orange-800";
  return "bg-yellow-100 text-yellow-800";
}

export default async function NetworkNotificationsPage() {
  const data = await getNotifications();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Notifications réseau"
          subtitle="Alertes consolidées issues du SEO local, des Google Posts et des demandes d’avis."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/direction/today">Aujourd’hui</ButtonLink>
              <ButtonLink href="/direction">Direction</ButtonLink>
              <ButtonLink href="/">Dashboard</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Notifications</div>
            <div className="text-3xl font-bold">{data.total}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Critiques</div>
            <div className="text-3xl font-bold">{data.critical}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Hautes</div>
            <div className="text-3xl font-bold">{data.high}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Moyennes</div>
            <div className="text-3xl font-bold">{data.medium}</div>
          </div>
        </div>

        <div className="space-y-4">
          {data.notifications.map((notification, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-5 border">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-lg">{notification.title}</div>
                  <div className="text-sm text-gray-500">{notification.type}</div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${priorityClass(notification.priority)}`}>
                  {notification.priority}
                </span>
              </div>

              <div className="text-sm text-gray-700 mb-4">
                {notification.message}
              </div>

              <ButtonLink href={notification.link}>
                Ouvrir
              </ButtonLink>
            </div>
          ))}

          {data.notifications.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Aucune notification réseau pour le moment.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
