"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { indexationApi } from "../../../lib/indexation-api";
import IndexationRolloutPlanner from "../IndexationRolloutPlanner";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function runSiteSlug(run) {
  return run?.sourcePlan?.siteSlug || run?.actions?.[0]?.payload?.siteSlug || null;
}

function latestRunBySite(runs) {
  const result = new Map();
  for (const run of asArray(runs)) {
    const slug = runSiteSlug(run);
    if (!slug || result.has(slug)) continue;
    result.set(slug, run);
  }
  return result;
}

export default function RolloutPageClient() {
  const [candidates, setCandidates] = useState({ sites: [] });
  const [history, setHistory] = useState({ runs: [] });
  const [properties, setProperties] = useState({ properties: [] });
  const [siteUrl, setSiteUrl] = useState("");
  const [operator, setOperator] = useState("");
  const [preflights, setPreflights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      indexationApi.candidates(),
      indexationApi.history({ limit: 100 }),
      indexationApi.properties(),
    ])
      .then(([candidatePayload, historyPayload, propertyPayload]) => {
        if (cancelled) return;
        setCandidates(candidatePayload || { sites: [] });
        setHistory(historyPayload || { runs: [] });
        setProperties(propertyPayload || { properties: [] });
        const owner = asArray(propertyPayload?.properties).find(
          (property) => property.eligibleForSitemapSubmission === true
        );
        if (owner?.siteUrl) setSiteUrl(owner.siteUrl);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message || "Impossible de charger le déploiement contrôlé.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestRuns = useMemo(() => latestRunBySite(history?.runs), [history]);
  const rows = useMemo(
    () =>
      asArray(candidates?.sites).map((site) => ({
        site,
        run: latestRuns.get(site.siteSlug) || null,
      })),
    [candidates, latestRuns]
  );

  const ownerProperties = asArray(properties?.properties).filter(
    (property) => property.eligibleForSitemapSubmission === true
  );

  const preflight = async (site) => {
    if (!siteUrl) {
      setError("Sélectionnez d’abord une propriété Search Console propriétaire.");
      return null;
    }
    setError("");
    setNotice("");
    try {
      const result = await indexationApi.preflight({ siteSlug: site.siteSlug, siteUrl });
      if (result?.ready === true) {
        setPreflights((current) => ({ ...current, [site.siteSlug]: result }));
      }
      return result;
    } catch (preflightError) {
      setError(`${site.siteSlug} : ${preflightError.message}`);
      return null;
    }
  };

  const prepare = async (site) => {
    if (!preflights[site.siteSlug]?.ready) {
      setError(`${site.siteSlug} : préflight valide requis.`);
      return null;
    }
    setError("");
    setNotice("");
    try {
      const result = await indexationApi.prepare({
        siteSlug: site.siteSlug,
        siteUrl,
        sitemapUrl: site.sitemapUrl,
        requestedBy: operator.trim() || null,
      });
      setNotice(`${site.siteSlug} : run préparé. Approbation individuelle requise dans le cockpit.`);
      return result;
    } catch (prepareError) {
      setError(`${site.siteSlug} : ${prepareError.message}`);
      return null;
    }
  };

  return (
    <main className="indexation-shell">
      <header className="indexation-hero">
        <div>
          <p className="indexation-eyebrow">Marketing Engine · SEO</p>
          <h1>Déploiement contrôlé de l’indexation</h1>
          <p>
            Préparez une vague d’agences sans pouvoir approuver ni soumettre en masse. Les opérations Google restent individuelles dans le cockpit principal.
          </p>
        </div>
        <Link className="indexation-nav-link" href="/indexation">Retour au cockpit</Link>
      </header>

      <section className="indexation-controls">
        <label>
          <span>Propriété Search Console</span>
          {ownerProperties.length ? (
            <select value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}>
              <option value="">Choisir une propriété propriétaire</option>
              {ownerProperties.map((property) => (
                <option key={property.siteUrl} value={property.siteUrl}>{property.siteUrl}</option>
              ))}
            </select>
          ) : (
            <input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="sc-domain:agences.mondescale.com" />
          )}
        </label>
        <label>
          <span>Opérateur de préparation</span>
          <input value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="Nom de l’opérateur" />
        </label>
      </section>

      {error ? <div className="indexation-message indexation-error">{error}</div> : null}
      {notice ? <div className="indexation-message indexation-notice">{notice}</div> : null}
      {loading ? <div className="indexation-empty">Chargement de la vague d’indexation…</div> : null}

      {!loading ? (
        <IndexationRolloutPlanner
          rows={rows}
          preflights={preflights}
          siteUrl={siteUrl}
          onPreflight={preflight}
          onPrepare={prepare}
        />
      ) : null}
    </main>
  );
}
