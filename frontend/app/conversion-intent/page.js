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

const PRIORITY_LABELS = {
  critical: "Critique",
  high: "Haute",
  medium: "À surveiller",
};

async function getSummary() {
  const response = await fetch(`${BACKEND_URL}/api/conversions/summary?days=30`, {
    headers: { "x-tenant-slug": TENANT_SLUG },
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      totalEvents: 0,
      pageViews: 0,
      conversionEvents: 0,
      conversionRate: null,
      pages: [],
      rows: [],
      optimization: {
        opportunityCount: 0,
        strongEvidencePageCount: 0,
        usableEvidencePageCount: 0,
        opportunities: [],
        strengths: [],
        benchmarks: {},
      },
      temporal: {
        comparablePageCount: 0,
        improvingCount: 0,
        degradingCount: 0,
        stableCount: 0,
        comparisons: [],
        improving: [],
        degrading: [],
        rankings: [],
      },
    };
  }
  return response.json();
}

function rate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} %` : "—";
}

function signedPoints(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(2)} pts`;
}

function signedPercent(value) {
  if (!Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(1)} %`;
}

function EvidenceBadge({ confidence }) {
  const label = confidence === "strong"
    ? "Donnée solide"
    : confidence === "usable"
      ? "Donnée exploitable"
      : "Donnée insuffisante";
  return <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600">{label}</span>;
}

function TrendBadge({ trend }) {
  const labels = {
    improving: "En amélioration",
    degrading: "En dégradation",
    stable: "Stable",
    insufficient: "Signal insuffisant",
  };
  return <span className="text-xs rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">{labels[trend] || trend}</span>;
}

export default async function ConversionIntentPage() {
  await requireRole(["admin", "manager"]);
  const data = await getSummary();
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const optimization = data.optimization || {};
  const opportunities = Array.isArray(optimization.opportunities) ? optimization.opportunities : [];
  const strengths = Array.isArray(optimization.strengths) ? optimization.strengths : [];
  const temporal = data.temporal || {};
  const comparisons = Array.isArray(temporal.comparisons) ? temporal.comparisons : [];
  const rankings = Array.isArray(temporal.rankings) ? temporal.rankings : [];
  const degrading = Array.isArray(temporal.degrading) ? temporal.degrading : [];
  const improving = Array.isArray(temporal.improving) ? temporal.improving : [];

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Conversion & Intent"
          subtitle="MSE-25.45 — mesure réelle, comparaison temporelle, benchmarks réseau et recommandations sans écriture automatique"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Vues de pages" value={data.pageViews || 0} />
          <StatCard label="Interactions" value={data.conversionEvents || 0} />
          <StatCard label="Taux interaction / vue" value={rate(data.conversionRate)} />
          <StatCard label="Opportunités détectées" value={optimization.opportunityCount || 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Pages comparables</div>
            <div className="text-3xl font-bold mt-1">{temporal.comparablePageCount || 0}</div>
            <div className="text-xs text-gray-500 mt-2">40 vues minimum sur chacune des deux périodes.</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">En amélioration</div>
            <div className="text-3xl font-bold mt-1">{temporal.improvingCount || 0}</div>
            <div className="text-xs text-gray-500 mt-2">Évolution suffisamment forte pour dépasser le bruit.</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">En dégradation</div>
            <div className="text-3xl font-bold mt-1">{temporal.degradingCount || 0}</div>
            <div className="text-xs text-gray-500 mt-2">Signal prioritaire à rapprocher des changements récents.</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="text-sm text-gray-500">Taux vs période précédente</div>
            <div className="text-3xl font-bold mt-1">{signedPoints(temporal.conversionRateDeltaPoints)}</div>
            <div className="text-xs text-gray-500 mt-2">Trafic {signedPercent(temporal.pageViewDeltaPercent)} · interactions {signedPercent(temporal.conversionEventDeltaPercent)}</div>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow p-5 mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-lg">Évolution période sur période</h2>
              <p className="text-sm text-gray-500">30 derniers jours comparés aux 30 jours précédents, à périmètre de page identique.</p>
            </div>
            <span className="text-sm font-semibold">{temporal.comparablePageCount || 0} page(s) comparable(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Agence</th>
                  <th className="py-2 pr-3">Page</th>
                  <th className="py-2 pr-3">Signal</th>
                  <th className="py-2 pr-3 text-right">Avant</th>
                  <th className="py-2 pr-3 text-right">Maintenant</th>
                  <th className="py-2 text-right">Écart</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.slice(0, 60).map((item) => (
                  <tr key={`${item.siteSlug}:${item.pageSlug}`} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{item.siteSlug}</td>
                    <td className="py-2 pr-3">{item.pageSlug}</td>
                    <td className="py-2 pr-3"><TrendBadge trend={item.trend} /></td>
                    <td className="py-2 pr-3 text-right">{rate(item.previousConversionRate)}</td>
                    <td className="py-2 pr-3 text-right">{rate(item.currentConversionRate)}</td>
                    <td className="py-2 text-right font-semibold">{signedPoints(item.rateDeltaPoints)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!comparisons.length ? <p className="text-sm text-gray-500 py-4">Les tendances apparaîtront quand deux périodes successives contiendront des données comparables.</p> : null}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Dégradations à investiguer</h2>
            <div className="space-y-3">
              {degrading.slice(0, 20).map((item) => (
                <article key={`${item.siteSlug}:${item.pageSlug}`} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.siteSlug} · {item.pageSlug}</div>
                      <div className="text-sm text-gray-500 mt-1">{item.previousPageViews} vues avant · {item.currentPageViews} maintenant</div>
                    </div>
                    <div className="text-right"><strong>{signedPoints(item.rateDeltaPoints)}</strong><div className="text-xs text-gray-500">{rate(item.previousConversionRate)} → {rate(item.currentConversionRate)}</div></div>
                  </div>
                </article>
              ))}
              {!degrading.length ? <p className="text-sm text-gray-500">Aucune dégradation statistiquement exploitable pour le moment.</p> : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Améliorations confirmées</h2>
            <div className="space-y-3">
              {improving.slice(0, 20).map((item) => (
                <article key={`${item.siteSlug}:${item.pageSlug}`} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.siteSlug} · {item.pageSlug}</div>
                      <EvidenceBadge confidence={item.confidence} />
                    </div>
                    <div className="text-right"><strong>{signedPoints(item.rateDeltaPoints)}</strong><div className="text-xs text-gray-500">{rate(item.previousConversionRate)} → {rate(item.currentConversionRate)}</div></div>
                  </div>
                </article>
              ))}
              {!improving.length ? <p className="text-sm text-gray-500">Aucune amélioration suffisamment documentée pour le moment.</p> : null}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow p-5 mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-lg">Priorités d’optimisation</h2>
              <p className="text-sm text-gray-500">Pages à fort signal dont le comportement mérite une intervention mesurée.</p>
            </div>
            <span className="text-sm font-semibold">{opportunities.length} signal(s)</span>
          </div>

          <div className="space-y-3">
            {opportunities.slice(0, 30).map((item, index) => (
              <article key={`${item.siteSlug}:${item.pageSlug}:${item.kind}:${index}`} className="border rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wide">{PRIORITY_LABELS[item.priority] || item.priority}</span>
                      <EvidenceBadge confidence={item.confidence} />
                    </div>
                    <div className="font-semibold">{item.siteSlug} · {item.pageSlug}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.recommendation}</div>
                  </div>
                  <div className="text-sm md:text-right shrink-0">
                    <div><strong>{item.pageViews}</strong> vues</div>
                    <div><strong>{rate(item.conversionRate)}</strong> taux</div>
                    {item.benchmarkRate != null ? <div className="text-gray-500">médiane réseau {rate(item.benchmarkRate)}</div> : null}
                  </div>
                </div>
              </article>
            ))}
            {!opportunities.length ? <p className="text-sm text-gray-500 py-3">Aucune recommandation n’est émise tant que les volumes ne fournissent pas un signal suffisant.</p> : null}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Classement réseau par page comparable</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2 pr-3">Page</th><th className="py-2 pr-3">Agence</th><th className="py-2 pr-3 text-right">Rang</th><th className="py-2 text-right">Taux</th></tr></thead>
                <tbody>{rankings.slice(0, 60).map((item) => <tr key={`${item.siteSlug}:${item.pageSlug}`} className="border-b last:border-0"><td className="py-2 pr-3">{item.pageSlug}</td><td className="py-2 pr-3 font-medium">{item.siteSlug}</td><td className="py-2 pr-3 text-right">{item.rank}/{item.peerCount}</td><td className="py-2 text-right">{rate(item.conversionRate)}</td></tr>)}</tbody>
              </table>
              {!rankings.length ? <p className="text-sm text-gray-500 py-4">Le classement réseau nécessite au moins 40 vues par page candidate.</p> : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="font-bold text-lg mb-4">Références à préserver</h2>
            <div className="space-y-3">
              {strengths.slice(0, 20).map((item, index) => (
                <article key={`${item.siteSlug}:${item.pageSlug}:${index}`} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><div className="font-semibold">{item.siteSlug}</div><div className="text-sm text-gray-500">{item.pageSlug}</div></div>
                    <div className="text-right"><strong>{rate(item.conversionRate)}</strong><div className="text-xs text-gray-500">médiane {rate(item.benchmarkRate)}</div></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{item.recommendation}</p>
                </article>
              ))}
              {!strengths.length ? <p className="text-sm text-gray-500">Les références réseau apparaîtront lorsque plusieurs agences auront un volume comparable suffisant.</p> : null}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="font-bold text-lg mb-4">Performance par page</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-3">Agence</th><th className="py-2 pr-3">Page</th><th className="py-2 pr-3 text-right">Vues</th><th className="py-2 pr-3 text-right">Actions</th><th className="py-2 text-right">Taux</th></tr></thead>
              <tbody>{pages.slice(0, 50).map((item) => <tr key={`${item.siteSlug}:${item.pageSlug}`} className="border-b last:border-0"><td className="py-2 pr-3 font-medium">{item.siteSlug}</td><td className="py-2 pr-3">{item.pageSlug}</td><td className="py-2 pr-3 text-right">{item.pageViews}</td><td className="py-2 pr-3 text-right">{item.conversionEvents}</td><td className="py-2 text-right">{rate(item.conversionRate)}</td></tr>)}</tbody>
            </table>
            {!pages.length ? <p className="text-sm text-gray-500 py-4">Aucune donnée collectée pour le moment.</p> : null}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="font-bold text-lg mb-4">Interactions commerciales observées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows.filter((row) => row.action !== "page_view").slice(0, 60).map((row, index) => (
              <div key={`${row.siteSlug}:${row.pageSlug}:${row.action}:${row.intent}:${index}`} className="flex items-center justify-between gap-4 border rounded-lg px-3 py-2">
                <div className="min-w-0"><div className="font-semibold truncate">{ACTION_LABELS[row.action] || row.action}</div><div className="text-xs text-gray-500 truncate">{row.siteSlug} · {row.pageSlug} · {row.intent}</div></div>
                <strong className="text-blue-700">{row.events}</strong>
              </div>
            ))}
            {!rows.some((row) => row.action !== "page_view") ? <p className="text-sm text-gray-500">Aucune interaction commerciale collectée pour le moment.</p> : null}
          </div>
        </section>

        <div className="text-xs text-gray-500">
          Données first-party uniquement. Les tendances temporelles exigent deux périodes comparables et les recommandations MSE-25.45 restent déterministes et strictement read-only : aucune page, aucun CTA et aucun contenu public n’est modifié automatiquement.
        </div>
      </div>
    </main>
  );
}
