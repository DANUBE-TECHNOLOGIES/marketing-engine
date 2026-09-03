"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function asArray(value) { return Array.isArray(value) ? value : []; }
function runSiteSlug(run) { return run?.sourcePlan?.siteSlug || run?.actions?.[0]?.payload?.siteSlug || null; }
function pagePrefixFromSitemap(url) { return String(url || "").replace(/\/sitemap\.xml(?:\?.*)?$/i, ""); }
function number(value) { return Number(value || 0).toLocaleString("fr-FR"); }

function performanceState(payload) {
  if (!payload) return "UNKNOWN";
  if (Number(payload.rowCount || 0) > 0 || asArray(payload.rows).length > 0) return "SEARCH_DATA_AVAILABLE";
  return "NO_SEARCH_DATA_YET";
}

export default function IndexationObservabilityClient() {
  const [candidates, setCandidates] = useState({ sites: [] });
  const [properties, setProperties] = useState({ properties: [] });
  const [history, setHistory] = useState({ runs: [] });
  const [siteUrl, setSiteUrl] = useState("");
  const [observations, setObservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      indexationApi.candidates(),
      indexationApi.properties(),
      indexationApi.history({ status: "succeeded", limit: 100 }),
    ]).then(([candidatePayload, propertyPayload, historyPayload]) => {
      if (cancelled) return;
      setCandidates(candidatePayload || { sites: [] });
      setProperties(propertyPayload || { properties: [] });
      setHistory(historyPayload || { runs: [] });
      const owner = asArray(propertyPayload?.properties).find((item) => item.eligibleForSitemapSubmission === true);
      if (owner?.siteUrl) setSiteUrl(owner.siteUrl);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError.message || "Impossible de charger l’observabilité Search Console.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sites = asArray(candidates?.sites);
  const submitted = useMemo(() => {
    const values = new Set();
    for (const run of asArray(history?.runs)) {
      const slug = runSiteSlug(run);
      if (slug) values.add(slug);
    }
    return values;
  }, [history]);

  const observeAll = async () => {
    if (!siteUrl || !sites.length) return;
    setBusy(true);
    setError("");
    const next = {};
    for (const site of sites) {
      try {
        const [status, performance] = await Promise.all([
          indexationApi.status({ siteSlug: site.siteSlug, siteUrl }),
          indexationApi.performance({
            siteUrl,
            siteSlug: site.siteSlug,
            pagePrefix: pagePrefixFromSitemap(site.sitemapUrl),
            days: 28,
            dimensions: "page",
            rowLimit: 100,
          }),
        ]);
        next[site.siteSlug] = { status, performance, error: null };
      } catch (readError) {
        next[site.siteSlug] = { status: null, performance: null, error: readError.message || "Lecture impossible" };
      }
    }
    setObservations(next);
    setBusy(false);
  };

  const summary = useMemo(() => {
    const values = Object.values(observations);
    return {
      observed: values.length,
      googleHealthy: values.filter((item) => item?.status?.google?.healthy).length,
      pending: values.filter((item) => item?.status?.google?.isPending).length,
      data: values.filter((item) => performanceState(item?.performance) === "SEARCH_DATA_AVAILABLE").length,
      noData: values.filter((item) => performanceState(item?.performance) === "NO_SEARCH_DATA_YET").length,
      errors: values.filter((item) => item?.error).length,
    };
  }, [observations]);

  const ownerProperties = asArray(properties?.properties).filter((item) => item.eligibleForSitemapSubmission === true);

  return (
    <main className="indexation-shell">
      <header className="indexation-hero">
        <div>
          <p className="indexation-eyebrow">MSE-25.77 · Lecture seule</p>
          <h1>Observabilité de l’indexation</h1>
          <p>Une vue réseau qui rapproche les sitemaps déjà soumis et les signaux de performance Search Console, sans écriture Google et sans déduire une indexation que Google ne confirme pas.</p>
        </div>
        <Link className="indexation-nav-link" href="/indexation">Retour au cockpit</Link>
      </header>

      <section className="indexation-controls observability-controls">
        <label><span>Propriété Search Console</span><select value={siteUrl} onChange={(event) => { setSiteUrl(event.target.value); setObservations({}); }}><option value="">Choisir</option>{ownerProperties.map((property) => <option key={property.siteUrl} value={property.siteUrl}>{property.siteUrl} · {property.permissionLevel || "permission inconnue"}</option>)}</select></label>
        <div className="indexation-actions"><button type="button" disabled={loading || busy || !siteUrl || !sites.length} onClick={observeAll}>{busy ? "Lecture du réseau…" : "Observer le réseau"}</button></div>
      </section>

      {error ? <div className="indexation-message indexation-error">{error}</div> : null}
      {loading ? <div className="indexation-empty">Chargement des sources en lecture seule…</div> : null}

      <section className="indexation-metrics observability-metrics">
        <div className="indexation-metric"><strong>{number(sites.length)}</strong><span>mini-sites candidats</span></div>
        <div className="indexation-metric"><strong>{number(submitted.size)}</strong><span>sitemaps journalisés</span></div>
        <div className="indexation-metric"><strong>{number(summary.googleHealthy)}</strong><span>sitemaps traités</span></div>
        <div className="indexation-metric"><strong>{number(summary.data)}</strong><span>sites avec données Search</span></div>
        <div className="indexation-metric"><strong>{number(summary.noData)}</strong><span>sans données Search encore</span></div>
        <div className="indexation-metric"><strong>{number(summary.errors)}</strong><span>lectures en erreur</span></div>
      </section>

      <section className="indexation-card observability-table-card">
        <div className="indexation-card-head"><div><h2>État réseau</h2><p>Les données Search Console indiquent une visibilité organique observée ; leur absence ne prouve ni une désindexation ni une erreur SEO.</p></div></div>
        <div className="observability-table-wrap"><table className="observability-table"><thead><tr><th>Mini-site</th><th>Sitemap local</th><th>Google sitemap</th><th>URLs déclarées</th><th>Données 28 j</th><th>État</th></tr></thead><tbody>{sites.map((site) => { const observation = observations[site.siteSlug]; const google = observation?.status?.google; const state = observation?.error ? "READ_ERROR" : performanceState(observation?.performance); return <tr key={site.siteSlug}><td><strong>{site.siteName || site.agencyName || site.siteSlug}</strong><small>{site.siteSlug}</small></td><td>{submitted.has(site.siteSlug) ? "Soumis" : "Non journalisé"}</td><td>{google ? (google.isPending ? "En traitement" : google.healthy ? "Traité" : "À contrôler") : "—"}</td><td>{google?.submittedUrls ?? observation?.status?.local?.entryCount ?? "—"}</td><td>{observation?.performance ? `${number(observation.performance.rowCount)} lignes` : "—"}</td><td><span className={`observability-state observability-state-${state.toLowerCase()}`}>{state}</span>{observation?.error ? <small>{observation.error}</small> : null}</td></tr>; })}</tbody></table></div>
      </section>

      <div className="rollout-safety">READ ONLY · aucune préparation, approbation ou soumission de sitemap n’est accessible depuis cette vue. SEARCH_DATA_AVAILABLE signifie uniquement que Search Console retourne des lignes sur les 28 derniers jours.</div>
    </main>
  );
}
