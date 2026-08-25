"use client";

import { useEffect, useMemo, useState } from "react";
import { indexationApi } from "../../lib/indexation-api";

const LABELS = Object.freeze({
  ready: "Prête",
  blocked: "Bloquée",
  awaiting_approval: "À approuver",
  approved: "Approuvée",
  succeeded: "Soumise",
  failed: "Échec",
  running: "En cours",
});

const READINESS_LABELS = Object.freeze({
  "read-only-ready": "connectée en lecture seule",
  "oauth-token-missing": "connexion OAuth requise",
  "feature-disabled": "fonction désactivée",
  "property-not-accessible": "propriété inaccessible",
  "search-console-api-error": "erreur API Google",
  "readiness-error": "contrôle indisponible",
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function runSiteSlug(run) {
  return (
    run?.sourcePlan?.siteSlug ||
    run?.actions?.[0]?.payload?.siteSlug ||
    null
  );
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

function operationalStatus(site, run) {
  if (run?.status === "failed") return "failed";
  if (run?.status === "succeeded") return "succeeded";
  if (run?.status === "running") return "running";
  if (run?.status === "approved") return "approved";
  if (run?.status === "awaiting_approval") return "awaiting_approval";
  return site?.readyToSubmit === true ? "ready" : "blocked";
}

function readableIssue(item) {
  if (typeof item === "string") return item;
  return item?.message || item?.code || JSON.stringify(item);
}

function StatusBadge({ status }) {
  return (
    <span className={`indexation-status indexation-status-${status}`}>
      {LABELS[status] || status}
    </span>
  );
}

function Metric({ value, label }) {
  return (
    <div className="indexation-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function providerLabel(health, readiness) {
  if (readiness?.state) return READINESS_LABELS[readiness.state] || readiness.state;
  return health?.providerConfigured ? "provider configuré" : "provider non actif";
}

export default function IndexationCockpitClient() {
  const [health, setHealth] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [candidates, setCandidates] = useState({ sites: [] });
  const [history, setHistory] = useState({ runs: [] });
  const [properties, setProperties] = useState({ properties: [] });
  const [siteUrl, setSiteUrl] = useState("");
  const [operator, setOperator] = useState("");
  const [preflights, setPreflights] = useState({});
  const [busy, setBusy] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const applyResults = ([healthResult, readinessResult, candidatesResult, historyResult, propertiesResult]) => {
    if (healthResult.status === "fulfilled") setHealth(healthResult.value);
    if (readinessResult.status === "fulfilled") {
      const nextReadiness = readinessResult.value || null;
      setReadiness(nextReadiness);
      if (nextReadiness?.property) setSiteUrl((current) => current || nextReadiness.property);
    }
    if (candidatesResult.status === "fulfilled") setCandidates(candidatesResult.value || { sites: [] });
    if (historyResult.status === "fulfilled") setHistory(historyResult.value || { runs: [] });

    if (propertiesResult.status === "fulfilled") {
      const nextProperties = propertiesResult.value || { properties: [] };
      setProperties(nextProperties);
      const owner = asArray(nextProperties.properties).find(
        (property) => property.permissionLevel === "siteOwner"
      );
      if (owner?.siteUrl) setSiteUrl((current) => current || owner.siteUrl);
    } else {
      setProperties({ properties: [] });
    }

    if (candidatesResult.status === "rejected") {
      setError(candidatesResult.reason?.message || "Impossible de charger les candidats à l’indexation.");
    }
  };

  const fetchCockpit = () =>
    Promise.allSettled([
      indexationApi.health(),
      indexationApi.readiness(),
      indexationApi.candidates(),
      indexationApi.history({ limit: 100 }),
      indexationApi.properties(),
    ]);

  const load = async () => {
    setLoading(true);
    setError("");
    const results = await fetchCockpit();
    applyResults(results);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    fetchCockpit().then((results) => {
      if (cancelled) return;
      applyResults(results);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestRuns = useMemo(
    () => latestRunBySite(history?.runs),
    [history]
  );

  const rows = useMemo(
    () =>
      asArray(candidates?.sites).map((site) => {
        const run = latestRuns.get(site.siteSlug) || null;
        return { site, run, status: operationalStatus(site, run) };
      }),
    [candidates, latestRuns]
  );

  const metrics = useMemo(() => {
    const count = (status) => rows.filter((row) => row.status === status).length;
    return {
      total: rows.length,
      ready: count("ready"),
      blocked: count("blocked"),
      approval: count("awaiting_approval") + count("approved"),
      submitted: count("succeeded"),
      failed: count("failed"),
    };
  }, [rows]);

  const runAction = async (key, action, successMessage) => {
    setBusy((current) => ({ ...current, [key]: true }));
    setError("");
    setNotice("");

    try {
      const result = await action();
      setNotice(successMessage);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setBusy((current) => ({ ...current, [key]: false }));
    }
  };

  const preflight = async (site) => {
    if (readiness?.ready !== true) {
      setError("Search Console doit être connectée et la propriété vérifiée avant le préflight.");
      return;
    }
    if (!siteUrl) {
      setError("Sélectionnez d’abord la propriété Search Console propriétaire.");
      return;
    }

    const result = await runAction(
      `${site.siteSlug}:preflight`,
      () => indexationApi.preflight({ siteSlug: site.siteSlug, siteUrl }),
      `Préflight validé pour ${site.siteSlug}. Aucune donnée n’a été envoyée à Google.`
    );

    if (result?.ready === true) {
      setPreflights((current) => ({ ...current, [site.siteSlug]: result }));
    }
  };

  const prepare = async (site) => {
    if (!preflights[site.siteSlug]?.ready) {
      setError("Un préflight valide est requis avant de préparer la soumission.");
      return;
    }

    const result = await runAction(
      `${site.siteSlug}:prepare`,
      () =>
        indexationApi.prepare({
          siteSlug: site.siteSlug,
          siteUrl,
          sitemapUrl: site.sitemapUrl,
          requestedBy: operator.trim() || null,
        }),
      `Soumission préparée pour ${site.siteSlug}. Elle attend maintenant une approbation explicite.`
    );

    if (result) await load();
  };

  const approve = async (site, run) => {
    if (!operator.trim()) {
      setError("Renseignez le nom de l’opérateur avant d’approuver.");
      return;
    }

    const result = await runAction(
      `${site.siteSlug}:approve`,
      () => indexationApi.approve({ runId: run.id, approvedBy: operator.trim() }),
      `Soumission approuvée pour ${site.siteSlug}. Aucun envoi Google n’a encore eu lieu.`
    );

    if (result) await load();
  };

  const submit = async (site, run) => {
    if (health?.submissionCapable !== true) {
      setError("Le provider Search Console actuel est en lecture seule. Aucune soumission Google n’est autorisée.");
      return;
    }

    const result = await runAction(
      `${site.siteSlug}:submit`,
      () => indexationApi.submit({ runId: run.id }),
      `Sitemap de ${site.siteSlug} soumis à Search Console.`
    );

    if (result) await load();
  };

  const ownerProperties = asArray(properties?.properties).filter(
    (property) => property.permissionLevel === "siteOwner"
  );
  const providerReady = readiness?.ready === true;
  const readOnly = readiness?.accessMode === "read-only" || health?.accessMode === "read-only";
  const submissionCapable = health?.submissionCapable === true && readiness?.submissionCapable === true;
  const configuredProperty = readiness?.property || health?.configuredProperty || "sc-domain:agences.mondescale.com";

  return (
    <main className="indexation-shell">
      <header className="indexation-hero">
        <div>
          <p className="indexation-eyebrow">Marketing Engine · SEO</p>
          <h1>Opérations d’indexation</h1>
          <p>
            Pilotez la readiness, le préflight et l’approbation Search Console agence par agence, avec des gardes explicites avant toute écriture Google.
          </p>
        </div>
        <button type="button" className="indexation-secondary" onClick={load} disabled={loading}>
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      <section className={`provider-banner ${providerReady ? "provider-ready" : "provider-disabled"}`}>
        <div>
          <strong>Search Console : {providerLabel(health, readiness)}</strong>
          <span>
            {health?.provider || readiness?.provider || "inconnu"}
            {health?.credentialMode ? ` · ${health.credentialMode}` : ""}
            {readOnly ? " · read-only" : ""}
          </span>
          <span>
            Propriété : {configuredProperty}
            {readiness?.propertyAccess?.permissionLevel ? ` · ${readiness.propertyAccess.permissionLevel}` : ""}
          </span>
        </div>
        <small>
          Approbation explicite obligatoire · Soumission automatique désactivée
          {!submissionCapable ? " · Écriture Google désactivée" : ""}
        </small>
      </section>

      {readiness?.state === "oauth-token-missing" ? (
        <div className="indexation-message indexation-notice">
          <strong>Connexion Search Console requise.</strong>{" "}
          Le consentement demandé est limité à la lecture Search Console.
          {" "}
          <a href="/api/search-console/auth">Connecter Search Console</a>
        </div>
      ) : null}

      {readiness?.state === "feature-disabled" ? (
        <div className="indexation-message indexation-error">
          La connexion est prête côté application mais SEARCH_CONSOLE_ENABLED est encore désactivé dans le runtime.
        </div>
      ) : null}

      {readiness?.state === "property-not-accessible" ? (
        <div className="indexation-message indexation-error">
          Le compte Google connecté n’a pas accès à {configuredProperty}. Vérifiez les droits de propriété dans Search Console.
        </div>
      ) : null}

      {providerReady && readOnly ? (
        <div className="indexation-message indexation-notice">
          Search Console est opérationnelle en lecture seule. Les contrôles de propriété, performances, sitemap et préflight sont actifs ; aucune soumission Google ne peut partir avec ce provider.
        </div>
      ) : null}

      <section className="indexation-controls">
        <label>
          <span>Propriété Search Console</span>
          {ownerProperties.length ? (
            <select value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}>
              <option value="">Choisir une propriété propriétaire</option>
              {ownerProperties.map((property) => (
                <option key={property.siteUrl} value={property.siteUrl}>
                  {property.siteUrl}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={siteUrl || configuredProperty}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder="sc-domain:agences.mondescale.com"
            />
          )}
        </label>
        <label>
          <span>Opérateur d’approbation</span>
          <input
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
            placeholder="Nom de l’opérateur"
          />
        </label>
      </section>

      <section className="indexation-metrics">
        <Metric value={metrics.total} label="agences candidates" />
        <Metric value={metrics.ready} label="prêtes" />
        <Metric value={metrics.blocked} label="bloquées" />
        <Metric value={metrics.approval} label="à valider" />
        <Metric value={metrics.submitted} label="soumises" />
        <Metric value={metrics.failed} label="échecs" />
      </section>

      {error ? <div className="indexation-message indexation-error">{error}</div> : null}
      {notice ? <div className="indexation-message indexation-notice">{notice}</div> : null}

      <section className="indexation-list">
        {loading && !rows.length ? <p>Chargement des mini-sites…</p> : null}
        {!loading && !rows.length ? <div className="indexation-empty">Aucun mini-site publié candidat à l’indexation.</div> : null}

        {rows.map(({ site, run, status }) => {
          const blockers = asArray(site.blockers || site.readiness?.blockers);
          const warnings = asArray(site.warnings || site.readiness?.warnings);
          const preflightOk = preflights[site.siteSlug]?.ready === true;
          const canStartFreshCycle = site.readyToSubmit === true && (!run || run.status === "failed");

          return (
            <article className="indexation-card" key={site.siteSlug}>
              <div className="indexation-card-head">
                <div>
                  <h2>{site.siteName || site.agencyName || site.siteSlug}</h2>
                  <p>{site.siteSlug}</p>
                </div>
                <StatusBadge status={status} />
              </div>

              <a className="sitemap-link" href={site.sitemapUrl} target="_blank" rel="noreferrer">
                {site.sitemapUrl}
              </a>

              {blockers.length ? (
                <div className="issue-box issue-blocker">
                  <strong>Blocages</strong>
                  <ul>{blockers.map((item, index) => <li key={index}>{readableIssue(item)}</li>)}</ul>
                </div>
              ) : null}

              {warnings.length ? (
                <div className="issue-box issue-warning">
                  <strong>À améliorer</strong>
                  <ul>{warnings.map((item, index) => <li key={index}>{readableIssue(item)}</li>)}</ul>
                </div>
              ) : null}

              {run ? (
                <div className="run-summary">
                  <span>Dernière opération</span>
                  <strong>{run.status}</strong>
                  <small>{run.id}</small>
                </div>
              ) : null}

              {run?.status === "failed" ? (
                <div className="indexation-message indexation-error">
                  Le run précédent a échoué. Un nouveau préflight est obligatoire avant de créer une nouvelle soumission.
                </div>
              ) : null}

              {preflightOk ? (
                <div className="preflight-ok">Préflight validé · sitemap public et propriété propriétaire vérifiés.</div>
              ) : null}

              <div className="indexation-actions">
                {canStartFreshCycle ? (
                  <>
                    <button
                      type="button"
                      className="indexation-secondary"
                      onClick={() => preflight(site)}
                      disabled={!providerReady || busy[`${site.siteSlug}:preflight`]}
                    >
                      {busy[`${site.siteSlug}:preflight`] ? "Vérification…" : run?.status === "failed" ? "Relancer le préflight" : "Lancer le préflight"}
                    </button>
                    <button
                      type="button"
                      onClick={() => prepare(site)}
                      disabled={!preflightOk || busy[`${site.siteSlug}:prepare`]}
                    >
                      Préparer une nouvelle soumission
                    </button>
                  </>
                ) : null}

                {run?.status === "awaiting_approval" ? (
                  <button
                    type="button"
                    onClick={() => approve(site, run)}
                    disabled={busy[`${site.siteSlug}:approve`]}
                  >
                    Approuver explicitement
                  </button>
                ) : null}

                {run?.status === "approved" && submissionCapable ? (
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => submit(site, run)}
                    disabled={busy[`${site.siteSlug}:submit`]}
                  >
                    Soumettre à Google Search Console
                  </button>
                ) : null}

                {run?.status === "approved" && !submissionCapable ? (
                  <div className="indexation-message indexation-notice">
                    Approbation enregistrée. Envoi Google indisponible tant que le provider reste en lecture seule.
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
