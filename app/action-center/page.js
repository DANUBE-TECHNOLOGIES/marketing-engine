import { Page, Card, Block } from "../components/ui";

const API = "http://127.0.0.1:4100";

async function safeJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

function euros(v) {
  return Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - new Date().getTime()) / 86400000);
}

function priorityLabel(p) {
  if (p === "HIGH") return "🔴 Haute";
  if (p === "MEDIUM") return "🟠 Moyenne";
  return "🟢 Basse";
}

export default async function ActionCenterPage() {
  const [tasksData, notificationsData, qualityData, bookingsData, paymentsData] =
    await Promise.all([
      safeJson(`${API}/tasks`),
      safeJson(`${API}/notifications/unread`),
      safeJson(`${API}/quality-engine`),
      safeJson(`${API}/bookings`),
      safeJson(`${API}/payments`),
    ]);

  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];
  const qualityRows = Array.isArray(qualityData?.rows) ? qualityData.rows : [];
  const bookings = Array.isArray(bookingsData) ? bookingsData : [];
  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const highTasks = pendingTasks.filter((t) => t.priority === "HIGH");

  const criticalQuality = qualityRows.filter((r) => r.level === "RED");

  const paidByBooking = new Map();

  for (const p of payments) {
    if (p.status !== "PAID") continue;
    paidByBooking.set(
      p.bookingId,
      Number(paidByBooking.get(p.bookingId) || 0) + Number(p.amount || 0)
    );
  }

  const financialRisks = bookings
    .map((b) => {
      const paid = Number(paidByBooking.get(b.id) || 0);
      const total = Number(b.totalAmount || 0);
      const balance = Math.max(total - paid, 0);
      const days = daysUntil(b.departureDate);

      return {
        ...b,
        paid,
        total,
        balance,
        days,
      };
    })
    .filter((b) => b.balance > 0 && b.days !== null && b.days >= 0 && b.days <= 35);

  const travelBookRisks = bookings
    .map((b) => ({
      ...b,
      days: daysUntil(b.departureDate),
    }))
    .filter((b) => b.days !== null && b.days >= 0 && b.days <= 7 && !b.travelBookReady);

  const documentTasks = pendingTasks.filter((t) => {
    const title = String(t.title || "").toLowerCase();
    return (
      title.includes("document") ||
      title.includes("passeport") ||
      title.includes("assurance") ||
      title.includes("visa") ||
      title.includes("voucher")
    );
  });

  const urgentItems = [
    ...notifications.map((n) => ({
      id: `n-${n.id}`,
      type: "Notification",
      title: n.title,
      subtitle: n.message || "",
      priority: n.priority || "MEDIUM",
      link: n.linkUrl || "/notifications",
    })),

    ...highTasks.map((t) => ({
      id: `t-${t.id}`,
      type: "Tâche",
      title: t.title,
      subtitle: `Priorité ${t.priority}`,
      priority: t.priority || "MEDIUM",
      link: t.bookingId ? `/booking/${t.bookingId}/cockpit` : "/tasks",
    })),

    ...financialRisks.map((b) => ({
      id: `f-${b.id}`,
      type: "Finance",
      title: `Solde à encaisser : ${euros(b.balance)}`,
      subtitle: `${b.destinationName || b.quote?.project?.destinationWish || "Dossier"} — départ J-${b.days}`,
      priority: b.days <= 7 ? "HIGH" : "MEDIUM",
      link: `/booking/${b.id}/payments`,
    })),

    ...travelBookRisks.map((b) => ({
      id: `tb-${b.id}`,
      type: "Carnet",
      title: "Carnet de voyage à finaliser",
      subtitle: `${b.destinationName || b.quote?.project?.destinationWish || "Dossier"} — départ J-${b.days}`,
      priority: b.days <= 3 ? "HIGH" : "MEDIUM",
      link: `/booking/${b.id}/travel-book-v2`,
    })),

    ...criticalQuality.map((r) => ({
      id: `q-${r.bookingId}`,
      type: "Qualité",
      title: `Dossier critique — score ${r.score}%`,
      subtitle: `${r.destination} — ${r.client || "-"}`,
      priority: "HIGH",
      link: `/booking/${r.bookingId}/cockpit`,
    })),
  ];

  urgentItems.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });

  return (
    <Page title="Action Center">
      <div className="grid grid-cols-4 gap-4 my-8">
        <Card title="Actions urgentes" value={urgentItems.length} />
        <Card title="Notifications" value={notifications.length} />
        <Card title="Tâches ouvertes" value={pendingTasks.length} />
        <Card title="Dossiers critiques" value={criticalQuality.length} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card title="Relances financières" value={financialRisks.length} />
        <Card title="Carnets urgents" value={travelBookRisks.length} />
        <Card title="Documents à traiter" value={documentTasks.length} />
        <Card title="Tâches haute priorité" value={highTasks.length} />
      </div>

      <Block title="File d'actions prioritaire">
        {urgentItems.length === 0 ? (
          <div className="text-gray-400">
            Aucune action prioritaire.
          </div>
        ) : (
          <div className="space-y-3">
            {urgentItems.slice(0, 50).map((item) => (
              <div key={item.id} className="border rounded p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold">
                    {priorityLabel(item.priority)} — {item.type} — {item.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.subtitle}
                  </div>
                </div>

                <a href={item.link} className="bg-blue-600 text-white px-4 py-2 rounded">
                  Traiter →
                </a>
              </div>
            ))}
          </div>
        )}
      </Block>

      <Block title="Accès rapides">
        <div className="grid grid-cols-4 gap-4">
          <a href="/notifications" className="border rounded p-5 text-center font-bold">
            🔔 Notifications
          </a>
          <a href="/tasks" className="border rounded p-5 text-center font-bold">
            ✅ Tâches
          </a>
          <a href="/financial-reminders" className="border rounded p-5 text-center font-bold">
            💶 Relances financières
          </a>
          <a href="/travel-books" className="border rounded p-5 text-center font-bold">
            📘 Carnets
          </a>
          <a href="/document-automation" className="border rounded p-5 text-center font-bold">
            🗂️ Documents
          </a>
          <a href="/quality-engine" className="border rounded p-5 text-center font-bold">
            🧠 Qualité
          </a>
          <a href="/post-travel" className="border rounded p-5 text-center font-bold">
            ⭐ Avis Google
          </a>
          <a href="/automation" className="border rounded p-5 text-center font-bold">
            🤖 Automations
          </a>
        </div>
      </Block>
    </Page>
  );
}
