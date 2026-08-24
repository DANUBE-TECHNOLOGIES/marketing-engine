import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";
const BACKEND_URL = String(
  process.env.BACKEND_INTERNAL_URL ||
  process.env.MONDESCALE_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000"
).replace(/\/+$/, "");

const ACTION_LABELS = {
  page_view: "Vue de page",
  quote_request: "Demande de devis",
  contact: "Contact",
  phone: "Appel",
  email: "E-mail",
  directions: "Itinéraire",
  appointment: "Rendez-vous",
  payment_options: "Paiement en plusieurs fois",
  destination_explore: "Exploration destination",
  service_explore: "Exploration service",
  advisor_contact: "Contact conseiller",
  partner_outbound: "Partenaire sortant",
};

async function getSummary() {
  const response = await fetch(`${BACKEND_URL}/api/conversions/summary?days=30`, {
    headers: { "x-tenant-slug": TENANT_SLUG },
    cache: "no-store",
  });
  if (!response.ok) {
    return { totalEvents: 0, pageViews: 0, conversionEvents: 0, conversionRate: null, pages: [], rows: [] };
  }
  return response.json();
}

function rate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} %` : "—";
}

export default async function ConversionIntentPage() {
  await requireRole(["admin", "manager"]);
  const data = await getSummary();
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const pages = Array.isArray(data.pages) ? data.pages : [];

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Conversion & Intent"
          subtitle="MSE-25.43 — interactions commerciales first-party sur les 30 derniers jours"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Vues de pages" value={data.pageViews || 0} />
          <StatCard label="Interactions" value={data.conversionEvents || 0} />
          <StatCard label="Taux interaction / vue" value={rate(data.conversionRate)} />
          <StatCard label="Événements totaux" value={data.totalEvents || 0} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Performance par page</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2 pr-3">Agence</th><th className="py-2 pr-3">Page</th><th className="py-2 pr-3 text-right">Vues</th><th className="py-2 pr-3 text-right">Actions</th><th className="py-2 text-right">Taux</th></tr></thead>
                <tbody>{pages.slice(0, 40).map((item) => <tr key={`${item.siteSlug}:${item.pageSlug}`} className="border-b last:border-0"><td className="py-2 pr-3 font-medium">{item.siteSlug}</td><td className="py-2 pr-3">{item.pageSlug}</td><td className="py-2 pr-3 text-right">{item.pageViews}</td><td className="py-2 pr-3 text-right">{item.conversionEvents}</td><td className="py-2 text-right">{rate(item.conversionRate)}</td></tr>)}</tbody>
              </table>
              {!pages.length ? <p className="text-sm text-gray-500 py-4">Aucune donnée collectée pour le moment.</p> : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Interactions commerciales</h2>
            <div className="space-y-2">
              {rows.filter((row) => row.action !== "page_view").slice(0, 40).map((row, index) => (
                <div key={`${row.siteSlug}:${row.pageSlug}:${row.action}:${row.intent}:${index}`} className="flex items-center justify-between gap-4 border rounded-lg px-3 py-2">
                  <div className="min-w-0"><div className="font-semibold truncate">{ACTION_LABELS[row.action] || row.action}</div><div className="text-xs text-gray-500 truncate">{row.siteSlug} · {row.pageSlug} · {row.intent}</div></div>
                  <strong className="text-blue-700">{row.events}</strong>
                </div>
              ))}
              {!rows.some((row) => row.action !== "page_view") ? <p className="text-sm text-gray-500">Aucune interaction commerciale collectée pour le moment.</p> : null}
            </div>
          </section>
        </div>

        <div className="text-xs text-gray-500">
          Données first-party uniquement. Aucun nom, e-mail, téléphone, cookie, adresse IP ou user-agent n’est stocké dans les événements MSE-25.43.
        </div>
      </div>
    </main>
  );
}
