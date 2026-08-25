import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";
const BACKEND_URL = String(process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || process.env.BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

async function getJson(path, fallback) {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, { headers: { "x-tenant-slug": TENANT_SLUG }, cache: "no-store" });
    return response.ok ? response.json() : fallback;
  } catch { return fallback; }
}

function rate(value) { return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} %` : "—"; }
function signedPoints(value) { if (!Number.isFinite(Number(value))) return "—"; const n = Number(value); return `${n > 0 ? "+" : ""}${n.toFixed(2)} pts`; }
function EvidenceBadge({ evidence }) { return <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600">{evidence === "usable" ? "Signal exploitable" : "Signal insuffisant"}</span>; }

export default async function ConversionIntentPage() {
  await requireRole(["admin", "manager"]);
  const [data, journey] = await Promise.all([
    getJson("/api/conversions/summary?days=30", { pageViews: 0, conversionEvents: 0, conversionRate: null, pages: [], optimization: {}, temporal: {} }),
    getJson("/api/conversions/journeys?days=30", { journeyCount: 0, multiStepJourneyCount: 0, commercialJourneyCount: 0, commercialJourneyRate: null, averageSteps: null, topPaths: [], intelligence: {} }),
  ]);
  const optimization = data.optimization || {};
  const temporal = data.temporal || {};
  const intelligence = journey.intelligence || {};
  const frictions = Array.isArray(intelligence.frictionPoints) ? intelligence.frictionPoints : [];
  const strengths = Array.isArray(intelligence.strengths) ? intelligence.strengths : [];
  const transitions = Array.isArray(intelligence.transitions) ? intelligence.transitions : [];
  const topPaths = Array.isArray(journey.topPaths) ? journey.topPaths : [];
  const opportunities = Array.isArray(optimization.opportunities) ? optimization.opportunities : [];
  const comparisons = Array.isArray(temporal.comparisons) ? temporal.comparisons : [];

  return <main className="min-h-screen bg-gray-100 p-8 text-gray-900"><div className="max-w-7xl mx-auto">
    <PageHeader title="Conversion & Journey Intelligence" subtitle="MSE-25.47 — performance, parcours commerciaux, transitions et points de friction · analyse strictement read-only" />

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="Vues de pages" value={data.pageViews || 0} />
      <StatCard label="Interactions" value={data.conversionEvents || 0} />
      <StatCard label="Parcours observés" value={journey.journeyCount || 0} />
      <StatCard label="Parcours commerciaux" value={rate(journey.commercialJourneyRate)} />
    </div>

    <section className="bg-white rounded-xl shadow p-5 mb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5"><div><h2 className="font-bold text-xl">Journey Intelligence</h2><p className="text-sm text-gray-500 mt-1">Lecture des chemins réellement empruntés avant une action commerciale. Aucune modification du mini-site n’est déclenchée.</p></div><span className="text-xs font-semibold rounded-full bg-gray-100 px-3 py-2">Seuil : {intelligence.evidenceGate || "5-journeys"}</span></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4"><div className="text-xs text-gray-500">Multi-étapes</div><div className="text-2xl font-bold mt-1">{journey.multiStepJourneyCount || 0}</div></div>
        <div className="border rounded-xl p-4"><div className="text-xs text-gray-500">Commerciaux</div><div className="text-2xl font-bold mt-1">{journey.commercialJourneyCount || 0}</div></div>
        <div className="border rounded-xl p-4"><div className="text-xs text-gray-500">Étapes moyennes</div><div className="text-2xl font-bold mt-1">{journey.averageSteps ?? "—"}</div></div>
        <div className="border rounded-xl p-4"><div className="text-xs text-gray-500">Frictions exploitables</div><div className="text-2xl font-bold mt-1">{frictions.length}</div></div>
      </div>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <section className="bg-white rounded-xl shadow p-5"><h2 className="font-bold text-lg">Points de rupture potentiels</h2><p className="text-sm text-gray-500 mb-4">Pages où des parcours s’arrêtent fréquemment sans atteindre une action commerciale.</p><div className="space-y-3">{frictions.slice(0,15).map(item => <article key={item.pageSlug} className="border rounded-xl p-4"><div className="flex justify-between gap-4"><div><div className="font-semibold">{item.pageSlug}</div><div className="mt-2"><EvidenceBadge evidence={item.evidence}/></div></div><div className="text-right text-sm"><strong>{rate(item.terminalRate)}</strong><div className="text-gray-500">terminaux</div><div className="mt-1">{rate(item.commercialRate)} commerciaux</div></div></div><p className="text-sm text-gray-600 mt-3">{item.recommendation}</p></article>)}{!frictions.length && <p className="text-sm text-gray-500">Aucun point de rupture n’atteint encore le seuil de preuve.</p>}</div></section>
      <section className="bg-white rounded-xl shadow p-5"><h2 className="font-bold text-lg">Passages à préserver</h2><p className="text-sm text-gray-500 mb-4">Transitions associées à des parcours commerciaux suffisamment documentés.</p><div className="space-y-3">{strengths.slice(0,15).map(item => <article key={item.transition} className="border rounded-xl p-4"><div className="flex justify-between gap-4"><div><div className="font-semibold">{item.transition}</div><div className="mt-2"><EvidenceBadge evidence={item.evidence}/></div></div><div className="text-right"><strong>{rate(item.commercialRate)}</strong><div className="text-xs text-gray-500">{item.journeys} parcours</div></div></div><p className="text-sm text-gray-600 mt-3">{item.recommendation}</p></article>)}{!strengths.length && <p className="text-sm text-gray-500">Les passages de référence apparaîtront après accumulation de parcours.</p>}</div></section>
    </div>

    <section className="bg-white rounded-xl shadow p-5 mb-8"><h2 className="font-bold text-lg mb-4">Transitions observées</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2 pr-3">Transition</th><th className="py-2 pr-3 text-right">Parcours</th><th className="py-2 pr-3 text-right">Commerciaux</th><th className="py-2 pr-3 text-right">Taux</th><th className="py-2">Preuve</th></tr></thead><tbody>{transitions.slice(0,50).map(item => <tr key={item.transition} className="border-b last:border-0"><td className="py-2 pr-3 font-medium">{item.transition}</td><td className="py-2 pr-3 text-right">{item.journeys}</td><td className="py-2 pr-3 text-right">{item.commercialJourneys}</td><td className="py-2 pr-3 text-right">{rate(item.commercialRate)}</td><td className="py-2"><EvidenceBadge evidence={item.evidence}/></td></tr>)}</tbody></table>{!transitions.length && <p className="text-sm text-gray-500 py-4">Aucune transition multi-page observée pour le moment.</p>}</div></section>

    <section className="bg-white rounded-xl shadow p-5 mb-8"><h2 className="font-bold text-lg mb-4">Parcours les plus fréquents</h2><div className="space-y-2">{topPaths.slice(0,20).map((item,index) => <div key={`${item.path}:${index}`} className="flex gap-4 justify-between border rounded-lg p-3"><span className="text-sm break-words">{item.path}</span><strong className="shrink-0">{item.journeys}×</strong></div>)}{!topPaths.length && <p className="text-sm text-gray-500">Les parcours apparaîtront après les premières sessions mesurées.</p>}</div></section>

    <section className="bg-white rounded-xl shadow p-5 mb-8"><h2 className="font-bold text-lg mb-4">Priorités page-level MSE-25.45</h2><div className="space-y-3">{opportunities.slice(0,20).map((item,index) => <article key={`${item.siteSlug}:${item.pageSlug}:${index}`} className="border rounded-xl p-4"><div className="font-semibold">{item.siteSlug} · {item.pageSlug}</div><p className="text-sm text-gray-600 mt-1">{item.recommendation}</p></article>)}{!opportunities.length && <p className="text-sm text-gray-500">Aucune recommandation page-level suffisamment documentée.</p>}</div></section>

    <section className="bg-white rounded-xl shadow p-5 mb-8"><h2 className="font-bold text-lg mb-4">Comparaison temporelle MSE-25.45</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2 pr-3">Agence</th><th className="py-2 pr-3">Page</th><th className="py-2 pr-3 text-right">Avant</th><th className="py-2 pr-3 text-right">Maintenant</th><th className="py-2 text-right">Écart</th></tr></thead><tbody>{comparisons.slice(0,40).map(item => <tr key={`${item.siteSlug}:${item.pageSlug}`} className="border-b last:border-0"><td className="py-2 pr-3">{item.siteSlug}</td><td className="py-2 pr-3">{item.pageSlug}</td><td className="py-2 pr-3 text-right">{rate(item.previousConversionRate)}</td><td className="py-2 pr-3 text-right">{rate(item.currentConversionRate)}</td><td className="py-2 text-right font-semibold">{signedPoints(item.rateDeltaPoints)}</td></tr>)}</tbody></table>{!comparisons.length && <p className="text-sm text-gray-500 py-4">Les tendances apparaîtront lorsque deux périodes seront comparables.</p>}</div></section>

    <div className="text-xs text-gray-500">Données first-party uniquement · zéro PII · session anonyme · recommandations déterministes et read-only. MSE-25.47 observe et priorise ; il n’écrit ni contenu, ni CTA, ni configuration publique.</div>
  </div></main>;
}
