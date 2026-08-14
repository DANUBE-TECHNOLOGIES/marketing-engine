"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function runSiteSlug(run) {
  return run?.sourcePlan?.siteSlug || run?.actions?.[0]?.payload?.siteSlug || null;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function SearchConsoleStatusClient() {
  const [history, setHistory] = useState({ runs: [] });
  const [properties, setProperties] = useState({ properties: [] });
  const [siteUrl, setSiteUrl] = useState("");
  const [statuses, setStatuses] = useState({});
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [historyPayload, propertyPayload] = await Promise.all([
        indexationApi.history({ status: "succeeded", limit: 100 }),
        indexationApi.properties(),
      ]);
      setHistory(historyPayload || { runs: [] });
      setProperties(propertyPayload || { properties: [] });
      const owner = asArray(propertyPayload?.properties).find(
        (property) => property.eligibleForSitemapSubmission === true
      );
      if (owner?.siteUrl) setSiteUrl((current) => current || owner.siteUrl);
    } catch (loadError) {
      setError(loadError.message || "Impossible de charger les sitemaps soumis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submittedRuns = useMemo(() => {
    const seen = new Set();
    return asArray(history?.runs).filter((run) => {
      const slug = runSiteSlug(run);
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
  }, [history]);

  const ownerProperties = asArray(properties?.properties).filter(
    (property) => property.eligibleForSitemapSubmission === true
  );

  const observe = async (run) => {
    const siteSlug = runSiteSlug(run);
    if (!siteSlug || !siteUrl) {
      setError("Une agence et une propriété Search Console sont requises.");
      return;
    }
    setBusy((current) => ({ ...current, [siteSlug]: true }));
    setError("");
    try {
      const result = await indexationApi.status({ siteSlug, siteUrl });
      setStatuses((current) => ({ ...current, [siteSlug]: result }));
    } catch (statusError) {
      setError(`${siteSlug} : ${statusError.message}`);
    } finally {
      setBusy((current) => ({ ...current, [siteSlug]: false }));
    }
  };

  return (
    <main className="indexation-shell">
      <header className="indexation-hero">
        <div>
          <p className="indexation-eyebrow">MSE-25.19 · Lecture seule</p>
          <h1>Suivi Search Console des sitemaps</h1>
          <p>
            Vérifiez le traitement Google des sitemaps déjà soumis. Cette vue n’expose aucune opération d’approbation, de préparation ou de soumission.
          </p>
        </div>
        <Link className="indexation-nav-link" href="/indexation">Retour au cockpit</Link>
      </header>

      <section className="indexation-controls">
        <label>
          <span>Propriété Search Console observée</span>
          {ownerProperties.length ? (
            <select value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}>
              <option value="">Choisir une propriété</option>
              {ownerProperties.map((property) => (
                <option key={property.siteUrl} value={property.siteUrl}>{property.siteUrl}</option>
              ))}
            </select>
          ) : (
            <input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="sc-domain:agences.mondescale.com" />
          )}
        </label>
      </section>

      {error ? <div className="indexation-message indexation-error">{error}</div> : null}
      {loading ? <div className="indexation-empty">Chargement des soumissions…</div> : null}
      {!loading && !submittedRuns.length ? <div className="indexation-empty">Aucun sitemap soumis n’est encore présent dans le journal.</div> : null}

      <section className="indexation-list">
        {submittedRuns.map((run) => {
          const siteSlug = runSiteSlug(run);
          const status = statuses[siteSlug];
          const google = status?.google;
          return (
            <article className="indexation-card" key={siteSlug}>
              <div className="indexation-card-head">
                <div>
                  <h2>{siteSlug}</h2>
                  <p>Dernier run réussi · {run.id}</p>
                </div>
                {google ? (
                  <span className={`indexation-status ${google.healthy ? "indexation-status-succeeded" : google.isPending ? "indexation-status-running" : "indexation-status-failed"}`}>
                    {google.isPending ? "En traitement" : google.healthy ? "Traité" : "À contrôler"}
                  </span>
                ) : null}
              </div>

              <div className="indexation-actions">
                <button type="button" className="indexation-secondary" onClick={() => observe(run)} disabled={!siteUrl || busy[siteSlug]}>
                  {busy[siteSlug] ? "Lecture Google…" : "Lire le statut Google"}
                </button>
              </div>

              {google ? (
                <div className="status-grid">
                  <div><span>Dernière soumission</span><strong>{formatDate(google.lastSubmitted)}</strong></div>
                  <div><span>Dernier téléchargement Google</span><strong>{formatDate(google.lastDownloaded)}</strong></div>
                  <div><span>URLs déclarées</span><strong>{google.submittedUrls}</strong></div>
                  <div><span>Erreurs sitemap</span><strong>{google.errors}</strong></div>
                  <div><span>Avertissements</span><strong>{google.warnings}</strong></div>
                  <div><span>État local</span><strong>{status.local?.entryCount ?? "—"} URLs</strong></div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="rollout-safety">
        Lecture seule : cette vue utilise uniquement les endpoints GET Search Console et ne peut pas soumettre de sitemap.
      </div>
    </main>
  );
}
