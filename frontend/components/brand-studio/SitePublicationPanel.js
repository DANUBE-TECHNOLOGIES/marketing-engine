"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchSitePublicationHistory,
  fetchSitePublicationPlan,
  fetchSitePublicationStatus,
  normalizeHistoryItems,
  publicationPercentage,
  publishSite,
  unpublishSite,
} from "../../lib/brand-studio/site-publication-api";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function PublicationHistory({ items }) {
  if (!items.length) {
    return (
      <div className="site-publication-empty">
        Aucune opération de publication n’a encore été enregistrée.
      </div>
    );
  }

  return (
    <div className="site-publication-history">
      {items.map((item) => (
        <article
          key={item.id}
          className={
            item.outcome === "success"
              ? "site-publication-history__item site-publication-history__item--success"
              : "site-publication-history__item site-publication-history__item--failed"
          }
        >
          <div>
            <strong>
              {item.operation === "unpublish" ? "Dépublication" : "Publication"}
            </strong>
            <span>{formatDate(item.completedAt || item.startedAt)}</span>
          </div>
          <div>
            <span>
              {item.pages?.processed || 0}/{item.pages?.total || 0} page(s)
            </span>
            <strong>{item.outcome === "success" ? "Succès" : "Échec"}</strong>
          </div>
          {item.error?.message ? <small>{item.error.message}</small> : null}
        </article>
      ))}
    </div>
  );
}

export default function SitePublicationPanel({
  siteId,
  siteSlug,
  readinessScore = 0,
  readinessMissing = 0,
  onChanged,
}) {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!siteId) {
      setPlan(null);
      setStatus(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [planPayload, statusPayload, historyPayload] = await Promise.all([
        fetchSitePublicationPlan(siteId),
        fetchSitePublicationStatus(siteId),
        fetchSitePublicationHistory(siteId, { limit: 20 }),
      ]);

      setPlan(planPayload);
      setStatus(statusPayload);
      setHistory(normalizeHistoryItems(historyPayload));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const percentage = useMemo(
    () => publicationPercentage(status),
    [status]
  );

  const fullyPublished = Boolean(status?.fullyPublished);
  const operationRunning = Boolean(operation || status?.operation);
  const readinessValid =
    Number(readinessScore) === 100 &&
    Number(readinessMissing) === 0 &&
    plan?.executable !== false;

  const canPublish =
    Boolean(siteId) &&
    readinessValid &&
    Boolean(plan?.planToken) &&
    !fullyPublished &&
    !operationRunning;

  const canUnpublish =
    Boolean(siteId) && fullyPublished && !operationRunning;

  async function execute(action) {
    if (!siteId) return;

    const confirmed = window.confirm(
      action === "publish"
        ? "Publier toutes les pages du mini-site ?"
        : "Dépublier toutes les pages du mini-site ?"
    );

    if (!confirmed) return;

    setOperation(action);
    setMessage(null);
    setError(null);

    try {
      const result =
        action === "publish"
          ? await publishSite(siteId, plan?.planToken)
          : await unpublishSite(siteId);

      setMessage(
        action === "publish"
          ? result.idempotent
            ? "Le mini-site était déjà entièrement publié."
            : "Le mini-site a été publié."
          : result.idempotent
            ? "Le mini-site était déjà dépublié."
            : "Le mini-site a été dépublié."
      );

      await load();

      if (typeof onChanged === "function") {
        await onChanged(result);
      }
    } catch (actionError) {
      setError(actionError.message || "L’opération de publication a échoué.");
      await load();
    } finally {
      setOperation(null);
    }
  }

  if (!siteId) {
    return (
      <section className="site-publication-panel site-publication-panel--empty">
        <strong>Publication indisponible</strong>
        <span>Aucun mini-site n’est associé à l’agence sélectionnée.</span>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="site-publication-panel site-publication-panel--loading">
        Chargement de l’état de publication…
      </section>
    );
  }

  return (
    <section className="site-publication-panel">
      <header className="site-publication-panel__header">
        <div>
          <p>État de publication</p>
          <h3>{fullyPublished ? "Mini-site publié" : "Mini-site non publié"}</h3>
          <span>{siteSlug || status?.site?.slug || siteId}</span>
        </div>
        <div
          className={
            fullyPublished
              ? "site-publication-panel__badge site-publication-panel__badge--published"
              : "site-publication-panel__badge"
          }
        >
          {fullyPublished ? "En ligne" : "Brouillon"}
        </div>
      </header>

      {message ? (
        <div className="site-publication-message site-publication-message--success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="site-publication-message site-publication-message--error">
          {error}
        </div>
      ) : null}

      <div className="site-publication-panel__progress">
        <div>
          <span>Pages publiées</span>
          <strong>
            {status?.pages?.published || 0}/{status?.pages?.total || 0}
          </strong>
        </div>
        <div className="site-publication-progress">
          <span style={{ width: `${percentage}%` }} />
        </div>
        <small>{percentage} %</small>
      </div>

      <div className="site-publication-panel__summary">
        <article>
          <span>Statut du site</span>
          <strong>{status?.site?.status || "—"}</strong>
        </article>
        <article>
          <span>Dernière publication</span>
          <strong>{formatDate(status?.site?.publishedAt)}</strong>
        </article>
        <article>
          <span>Readiness</span>
          <strong>{readinessScore} %</strong>
        </article>
        <article>
          <span>Éléments manquants</span>
          <strong>{readinessMissing}</strong>
        </article>
      </div>

      {!readinessValid && !fullyPublished ? (
        <aside className="site-publication-warning">
          <strong>Publication verrouillée</strong>
          <span>
            Tous les critères obligatoires doivent être validés avant la mise en ligne.
          </span>
        </aside>
      ) : null}

      <div className="site-publication-panel__actions">
        <button
          type="button"
          onClick={() => execute("publish")}
          disabled={!canPublish}
        >
          {operation === "publish" ? "Publication…" : "Publier le site"}
        </button>

        <button
          type="button"
          onClick={() => execute("unpublish")}
          disabled={!canUnpublish}
        >
          {operation === "unpublish" ? "Dépublication…" : "Dépublier le site"}
        </button>

        <button type="button" onClick={load} disabled={operationRunning}>
          Actualiser
        </button>
      </div>

      <section className="site-publication-plan">
        <header>
          <div>
            <h4>Plan de publication</h4>
            <span>Prévalidation non destructive</span>
          </div>
        </header>
        <div className="site-publication-panel__summary">
          <article>
            <span>Pages à publier</span>
            <strong>{plan?.pages?.toPublish ?? "—"}</strong>
          </article>
          <article>
            <span>Déjà publiées</span>
            <strong>{plan?.pages?.skipped ?? "—"}</strong>
          </article>
          <article>
            <span>Plan exécutable</span>
            <strong>{plan?.executable ? "Oui" : "Non"}</strong>
          </article>
        </div>
      </section>

      <section className="site-publication-panel__history">
        <header>
          <h4>Historique</h4>
        </header>
        <PublicationHistory items={history} />
      </section>
    </section>
  );
}
