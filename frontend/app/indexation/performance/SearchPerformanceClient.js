"use client";

import { useEffect, useMemo, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function asArray(value) { return Array.isArray(value) ? value : []; }
function percent(value) { return `${(Number(value || 0) * 100).toFixed(1)} %`; }
function number(value, digits = 0) { return Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }); }
function pagePrefixFromSitemap(url) { return String(url || "").replace(/\/sitemap\.xml(?:\?.*)?$/i, ""); }
function deltaText(value, formatter = (v) => number(v)) { const n = Number(value || 0); return `${n > 0 ? "+" : ""}${formatter(n)}`; }
function deltaClass(value) { const n = Number(value || 0); return n > 0 ? "performance-delta-up" : n < 0 ? "performance-delta-down" : "performance-delta-flat"; }

export default function SearchPerformanceClient() {
  const [candidates, setCandidates] = useState({ sites: [] });
  const [properties, setProperties] = useState({ properties: [] });
  const [siteUrl, setSiteUrl] = useState("");
  const [siteSlug, setSiteSlug] = useState("");
  const [days, setDays] = useState("28");
  const [dimension, setDimension] = useState("query");
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([indexationApi.candidates(), indexationApi.properties()])
      .then(([candidatePayload, propertyPayload]) => {
        setCandidates(candidatePayload || { sites: [] });
        setProperties(propertyPayload || { properties: [] });
        const firstSite = asArray(candidatePayload?.sites)[0];
        if (firstSite?.siteSlug) setSiteSlug(firstSite.siteSlug);
        const firstProperty = asArray(propertyPayload?.properties)[0];
        if (firstProperty?.siteUrl) setSiteUrl(firstProperty.siteUrl);
      })
      .catch((loadError) => setError(loadError.message || "Impossible de charger Search Console."))
      .finally(() => setLoading(false));
  }, []);

  const selectedSite = useMemo(
    () => asArray(candidates?.sites).find((site) => site.siteSlug === siteSlug) || null,
    [candidates, siteSlug]
  );

  const loadPerformance = async () => {
    if (!siteUrl || !selectedSite) {
      setError("Sélectionnez une propriété Search Console et une agence.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setPerformance(await indexationApi.performance({
        siteUrl,
        pagePrefix: pagePrefixFromSitemap(selectedSite.sitemapUrl),
        days,
        dimensions: dimension,
        rowLimit: 50,
      }));
    } catch (readError) {
      setError(readError.message || "Impossible de lire les performances Search Console.");
    } finally {
      setBusy(false);
    }
  };

  const availableProperties = asArray(properties?.properties);
  const rows = asArray(performance?.rows);
  const opportunities = dimension === "query"
    ? rows.filter((row) => row.impressions >= 20 && row.position >= 4 && row.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 8)
    : [];

  return (
    <main className="indexation-shell">
      <header className="indexation-hero">
        <div>
          <p className="indexation-eyebrow">MSE-25.20 · Feedback SEO</p>
          <h1>Performance organique des mini-sites</h1>
          <p>Mesurez ce que Google génère réellement après indexation : clics, impressions, CTR, position et principales requêtes ou pages.</p>
        </div>
        <a className="indexation-nav-link" href="/indexation">Retour au cockpit</a>
      </header>

      <section className="indexation-controls performance-controls">
        <label><span>Propriété Search Console</span><select value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}><option value="">Choisir</option>{availableProperties.map((property) => <option key={property.siteUrl} value={property.siteUrl}>{property.siteUrl}{property.permissionLevel ? ` · ${property.permissionLevel}` : ""}</option>)}</select></label>
        <label><span>Mini-site</span><select value={siteSlug} onChange={(event) => { setSiteSlug(event.target.value); setPerformance(null); }}><option value="">Choisir</option>{asArray(candidates?.sites).map((site) => <option key={site.siteSlug} value={site.siteSlug}>{site.siteName || site.agencyName || site.siteSlug}</option>)}</select></label>
        <label><span>Période</span><select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">7 jours</option><option value="28">28 jours</option><option value="90">90 jours</option></select></label>
        <label><span>Détail</span><select value={dimension} onChange={(event) => setDimension(event.target.value)}><option value="query">Requêtes</option><option value="page">Pages</option></select></label>
      </section>

      <div className="indexation-actions"><button type="button" onClick={loadPerformance} disabled={loading || busy || !siteUrl || !selectedSite}>{busy ? "Lecture Search Console…" : "Charger les performances"}</button></div>
      {error ? <div className="indexation-message indexation-error">{error}</div> : null}

      {performance ? <>
        <section className="indexation-metrics performance-metrics">
          <div className="indexation-metric"><strong>{number(performance.totals?.clicks)}</strong><span>clics Google</span><small className={deltaClass(performance.delta?.clicks)}>{deltaText(performance.delta?.clicks)} vs période précédente</small></div>
          <div className="indexation-metric"><strong>{number(performance.totals?.impressions)}</strong><span>impressions</span><small className={deltaClass(performance.delta?.impressions)}>{deltaText(performance.delta?.impressions)} vs période précédente</small></div>
          <div className="indexation-metric"><strong>{percent(performance.totals?.ctr)}</strong><span>CTR</span><small className={deltaClass(performance.delta?.ctr)}>{deltaText(performance.delta?.ctr, percent)} vs période précédente</small></div>
          <div className="indexation-metric"><strong>{number(performance.totals?.position, 1)}</strong><span>position moyenne</span><small className={deltaClass(performance.delta?.position)}>{deltaText(performance.delta?.position, (v) => number(v, 1))} positions gagnées</small></div>
        </section>

        {opportunities.length ? <section className="indexation-card performance-opportunities"><div className="indexation-card-head"><div><h2>Opportunités SEO prioritaires</h2><p>Requêtes avec au moins 20 impressions et une position moyenne comprise entre 4 et 20.</p></div></div><div className="opportunity-grid">{opportunities.map((row) => <div key={row.dimensions.query} className="opportunity-card"><strong>{row.dimensions.query}</strong><span>{number(row.impressions)} impressions · position {number(row.position, 1)} · CTR {percent(row.ctr)}</span><small>Potentiel : renforcer contenu local, title/meta et maillage interne.</small></div>)}</div></section> : null}

        <section className="indexation-card performance-table-card">
          <div className="indexation-card-head"><div><h2>{dimension === "query" ? "Principales requêtes" : "Pages les plus visibles"}</h2><p>{performance.startDate} → {performance.endDate} · comparaison {performance.previousStartDate} → {performance.previousEndDate} · {performance.rowCount} lignes retournées</p></div></div>
          <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>{dimension === "query" ? "Requête" : "Page"}</th><th>Clics</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.dimensions?.[dimension] || index}`}><td>{row.dimensions?.[dimension] || "—"}</td><td>{number(row.clicks)}</td><td>{number(row.impressions)}</td><td>{percent(row.ctr)}</td><td>{number(row.position, 1)}</td></tr>)}</tbody></table></div>
          {!rows.length ? <div className="indexation-empty">Aucune donnée Search Console sur cette période.</div> : null}
        </section>
        <div className="rollout-safety">{performance.note}</div>
      </> : null}
    </main>
  );
}

export { pagePrefixFromSitemap };
