import { Page, Card, Block } from "../components/ui";

const API = "http://127.0.0.1:4100";

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - new Date().getTime()) / 86400000);
}

export default async function TravelBooksDashboard() {
  const [bookingsRes] = await Promise.all([
    fetch(`${API}/bookings`, { cache: "no-store" }),
  ]);

  const bookingsData = await bookingsRes.json();
  const bookings = Array.isArray(bookingsData) ? bookingsData : [];

  const withDeparture = bookings.filter((b) => b.departureDate);

  const rows = await Promise.all(
    withDeparture.map(async (b) => {
      let tb = null;

      try {
        const res = await fetch(`${API}/travel-book-v2/${b.id}`, {
          cache: "no-store",
        });
        tb = await res.json();
      } catch (e) {
        tb = null;
      }

      const days = daysUntil(b.departureDate);

      return {
        ...b,
        days,
        travelBook: tb,
        status: tb?.status || "DRAFT",
      };
    })
  );

  const j7 = rows.filter((r) => r.days !== null && r.days >= 0 && r.days <= 7);
  const j3 = rows.filter((r) => r.days !== null && r.days >= 0 && r.days <= 3);
  const missing = rows.filter((r) => r.status !== "READY" && r.status !== "SENT");
  const urgent = missing.filter((r) => r.days !== null && r.days >= 0 && r.days <= 7);

  return (
    <Page title="Carnets de voyage">
      <div className="grid grid-cols-4 gap-4 my-8">
        <Card title="Départs suivis" value={rows.length} />
        <Card title="Carnets à produire" value={missing.length} />
        <Card title="Départs J-7" value={j7.length} />
        <Card title="Urgents J-3" value={j3.length} />
      </div>

      <Block title="Carnets urgents">
        {urgent.length === 0 ? (
          <div className="text-gray-400">Aucun carnet urgent.</div>
        ) : (
          <div className="space-y-3">
            {urgent
              .sort((a, b) => a.days - b.days)
              .map((b) => (
                <div key={b.id} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold">
                      J-{b.days} — {b.destinationName || b.quote?.project?.destinationWish || "Destination"}
                    </div>

                    <div className="text-sm text-gray-500">
                      Départ : {new Date(b.departureDate).toLocaleDateString("fr-FR")}
                    </div>

                    <div className="text-sm text-red-600 font-bold">
                      Statut carnet : {b.status}
                    </div>
                  </div>

                  <div className="text-right">
                    <a
                      href={`/booking/${b.id}/travel-book-v2`}
                      className="bg-blue-600 text-white px-4 py-2 rounded inline-block"
                    >
                      Préparer →
                    </a>

                    <br />

                    <a
                      href={`/booking/${b.id}/dashboard`}
                      className="text-blue-600 text-sm"
                    >
                      Dossier →
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Block>

      <Block title="Tous les carnets">
        {rows.length === 0 ? (
          <div className="text-gray-400">
            Aucun dossier avec date de départ.
          </div>
        ) : (
          <div className="space-y-3">
            {rows
              .sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate))
              .map((b) => (
                <div key={b.id} className="border rounded p-4 flex justify-between">
                  <div>
                    <div className="font-bold">
                      {b.destinationName || b.quote?.project?.destinationWish || "Destination"}
                    </div>

                    <div className="text-sm text-gray-500">
                      Départ : {new Date(b.departureDate).toLocaleDateString("fr-FR")}
                      {b.days !== null ? ` — J-${b.days}` : ""}
                    </div>

                    <div className="text-xs text-gray-400">
                      TO : {b.supplierName || "-"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={b.status === "READY" || b.status === "SENT" ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                      {b.status}
                    </div>

                    <a
                      href={`/booking/${b.id}/travel-book-v2`}
                      className="text-blue-600 text-sm"
                    >
                      Ouvrir →
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Block>
    </Page>
  );
}
