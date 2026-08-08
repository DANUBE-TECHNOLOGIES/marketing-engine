"use client";

import {

  fetchSitePublicationPlan,  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchSitePublicationHistory,
  fetchSitePublicationStatus,
  normalizeHistoryItems,
  publicationPercentage,
  publishSite,
  unpublishSite,
} from "../../lib/brand-studio/site-publication-api";

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

function formatDuration(
  durationMs
) {
  const value =
    Number(
      durationMs ||
      0
    );

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(
    value /
    1000
  ).toFixed(1)} s`;
}

function operationStageLabel(
  stage,
  operation
) {
  if (
    stage ===
    "checking-readiness"
  ) {
    return "Vérification de la préparation…";
  }

  if (
    stage ===
    "rolling-back"
  ) {
    return "Compensation en cours…";
  }

  if (
    stage ===
    "finalizing"
  ) {
    return "Finalisation…";
  }

  if (
    stage ===
    "unpublishing" ||
    operation ===
      "unpublish"
  ) {
    return "Dépublication en cours…";
  }

  return "Publication en cours…";
}

function operationLabel(
  operation
) {
  return operation ===
    "unpublish"
    ? "Dépublication"
    : "Publication";
}

function outcomeLabel(
  outcome
) {
  if (
    outcome ===
    "success"
  ) {
    return "Succès";
  }

  if (
    outcome ===
    "failed"
  ) {
    return "Échec";
  }

  return outcome ||
    "Inconnu";
}

function PublicationHistory({
  items,
}) {
  if (!items.length) {
    return (
      <div className="site-publication-empty">
        Aucune opération de publication n’a encore été enregistrée.
      </div>
    );
  }

  return (
    <div className="site-publication-history">
      {items.map(
        (item) => (
          <article
            key={
              item.id
            }
            className={
              item.outcome ===
              "success"
                ? "site-publication-history__item site-publication-history__item--success"
                : "site-publication-history__item site-publication-history__item--failed"
            }
          >
            <div>
              <strong>
                {operationLabel(
                  item.operation
                )}
              </strong>

              <span>
                {formatDate(
                  item.completedAt ||
                  item.startedAt
                )}
              </span>
            </div>

            <div>
              <span>
                {item.actor?.name ||
                  item.actor?.id ||
                  "Utilisateur non identifié"}
              </span>

              <span>
                {item.pages?.processed ||
                  0}
                /
                {item.pages?.total ||
                  0}
                {" "}page(s)
              </span>

              <span>
                {formatDuration(
                  item.durationMs
                )}
              </span>
            </div>

            <div>
              <strong>
                {outcomeLabel(
                  item.outcome
                )}
              </strong>

              {item.error ? (
                <small>
                  {item.error.message}
                </small>
              ) : null}

              {item.rollback?.length ? (
                <small>
                  Compensation :
                  {" "}
                  {
                    item.rollback.filter(
                      (entry) =>
                        entry.outcome ===
                        "success"
                    ).length
                  }
                  /
                  {item.rollback.length}
                </small>
              ) : null}
            </div>
          </article>
        )
      )}
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
  const [
    plan,
    setPlan,
  ] =
    useState(
      null
    );

  const [
    status,
    setStatus,
  ] =
    useState(null);

  const [
    history,
    setHistory,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    operation,
    setOperation,
  ] =
    useState(null);

  const [
    message,
    setMessage,
  ] =
    useState(null);

  const [
    error,
    setError,
  ] =
    useState(null);

  const load =
    useCallback(
      async () => {
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
          const [
            planPayload,
            statusPayload,
            historyPayload,
          ] =
            await Promise.all([
              fetchSitePublicationPlan(
                siteId
              ),

              fetchSitePublicationStatus(
                siteId
              ),

              fetchSitePublicationHistory(
                siteId,
                {
                  limit:
                    20,
                }
              ),
            ]);

          setPlan(
            planPayload
          );

          setStatus(
            statusPayload
          );

          setHistory(
            normalizeHistoryItems(
              historyPayload
            )
          );
        } catch (
          loadError
        ) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        siteId,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  useEffect(
    () => {
      if (
        !siteId ||
        !(
          operation ||
          status?.operation
        )
      ) {
        return undefined;
      }

      const timer =
        window.setInterval(
          async () => {
            try {
              const statusPayload =
                await fetchSitePublicationStatus(
                  siteId
                );

              setStatus(
                statusPayload
              );
            } catch {
              // L’erreur principale reste gérée par execute() ou load().
            }
          },
          1200
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      operation,
      siteId,
      status?.operation,
    ]
  );

  const percentage =
    useMemo(
      () =>
        publicationPercentage(
          status
        ),
      [
        status,
      ]
    );

  const activeProgress =
    status?.operation
      ?.progress ||
    null;

  const displayedPercentage =
    activeProgress
      ? Number(
          activeProgress
            .percentage ||
          0
        )
      : percentage;

  const fullyPublished =
    Boolean(
      status?.fullyPublished
    );

  const operationRunning =
    Boolean(
      operation ||
      status?.operation
    );

  const readinessValid =
    Number(
      readinessScore
    ) === 100 &&
    Number(
      readinessMissing
    ) === 0 &&
    plan?.executable !==
      false;

  const canPublish =
    Boolean(
      siteId
    ) &&
    readinessValid &&
    Boolean(
      plan?.planToken
    ) &&
    !fullyPublished &&
    !operationRunning;

  const canUnpublish =
    Boolean(
      siteId
    ) &&
    fullyPublished &&
    !operationRunning;

  async function execute(
    action
  ) {
    if (!siteId) {
      return;
    }

    const confirmed =
      window.confirm(
        action ===
          "publish"
          ? "Publier toutes les pages du mini-site ?"
          : "Dépublier toutes les pages du mini-site ?"
      );

    if (!confirmed) {
      return;
    }

    setOperation(
      action
    );

    setMessage(null);
    setError(null);

    try {
      const result =
        action ===
          "publish"
          ? await publishSite(
              siteId,
              plan?.planToken
            )
          : await unpublishSite(
              siteId
            );

      setMessage(
        action ===
          "publish"
          ? result.idempotent
            ? "Le mini-site était déjà entièrement publié."
            : "Le mini-site a été publié."
          : result.idempotent
            ? "Le mini-site était déjà dépublié."
            : "Le mini-site a été dépublié."
      );

      await load();

      if (
        typeof onChanged ===
        "function"
      ) {
        await onChanged(
          result
        );
      }
    } catch (
      actionError
    ) {
      if (
        actionError.code ===
        "SITE_NOT_READY"
      ) {
        setError(
          "Publication impossible : certains critères obligatoires ne sont pas validés."
        );
      } else if (
        actionError.code ===
        "PUBLICATION_PLAN_STALE"
      ) {
        setError(
          "Le contenu ou la préparation du mini-site a changé. Le plan doit être actualisé avant publication."
        );
      } else if (
        actionError.code ===
        "PUBLICATION_PLAN_TOKEN_REQUIRED"
      ) {
        setError(
          "Actualisez le plan de publication avant de poursuivre."
        );
      } else if (
        actionError.code ===
        "SITE_PUBLICATION_ALREADY_RUNNING"
      ) {
        setError(
          "Une opération est déjà en cours pour ce mini-site."
        );
      } else {
        setError(
          actionError.message
        );
      }

      await load();
    } finally {
      setOperation(null);
    }
  }

  if (!siteId) {
    return (
      <section className="site-publication-panel site-publication-panel--empty">
        <strong>
          Publication indisponible
        </strong>

        <span>
          Aucun mini-site n’est associé à l’agence sélectionnée.
        </span>
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
          <p>
            État de publication
          </p>

          <h3>
            {fullyPublished
              ? "Mini-site publié"
              : "Mini-site non publié"}
          </h3>

          <span>
            {siteSlug ||
              status?.site?.slug ||
              siteId}
          </span>
        </div>

        <div
          className={
            fullyPublished
              ? "site-publication-panel__badge site-publication-panel__badge--published"
              : "site-publication-panel__badge"
          }
        >
          {fullyPublished
            ? "En ligne"
            : "Brouillon"}
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
          <span>
            Pages publiées
          </span>

          <strong>
            {status?.pages?.published ||
              0}
            /
            {status?.pages?.total ||
              0}
          </strong>
        </div>

        <div className="site-publication-progress">
          <span
            style={{
              width:
                `${displayedPercentage}%`,
            }}
          />
        </div>

        <small>
          {displayedPercentage} %
        </small>
      </div>

      <div className="site-publication-panel__summary">
        <article>
          <span>
            Statut du site
          </span>

          <strong>
            {status?.site?.status ||
              "—"}
          </strong>
        </article>

        <article>
          <span>
            Dernière publication
          </span>

          <strong>
            {formatDate(
              status?.site
                ?.publishedAt
            )}
          </strong>
        </article>

        <article>
          <span>
            Readiness
          </span>

          <strong>
            {readinessScore} %
          </strong>
        </article>

        <article>
          <span>
            Éléments manquants
          </span>

          <strong>
            {readinessMissing}
          </strong>
        </article>
      </div>

      {!readinessValid &&
      !fullyPublished ? (
        <aside className="site-publication-warning">
          <strong>
            Publication verrouillée
          </strong>

          <span>
            Tous les critères obligatoires du tableau de préparation
            doivent être validés avant la mise en ligne.
          </span>
        </aside>
      ) : null}

      {operationRunning ? (
        <aside className="site-publication-running">
          <span className="site-publication-running__spinner" />

          <div>
            <strong>
              {operationStageLabel(
                status?.operation
                  ?.stage,
                operation ||
                  status?.operation
                    ?.operation
              )}
            </strong>

            <span>
              {activeProgress?.currentPage
                ? `${activeProgress.currentPage.title || activeProgress.currentPage.slug} — ${activeProgress.processed || 0}/${activeProgress.total || 0} page(s)`
                : "Les pages sont traitées séquentiellement par l’orchestrateur."}
            </span>

            {activeProgress ? (
              <div className="site-publication-running__progress">
                <span
                  style={{
                    width:
                      `${displayedPercentage}%`,
                  }}
                />

                <small>
                  {displayedPercentage} %
                </small>
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}

      <section className="site-publication-plan">
        <header>
          <div>
            <h4>
              Plan de publication
            </h4>

            <span>
              Prévalidation non destructive
            </span>
          </div>

          <strong>
            {plan?.executable
              ? plan?.idempotent
                ? "Aucune action nécessaire"
                : "Plan exécutable"
              : "Plan bloqué"}
          </strong>
        </header>

        {plan?.planToken ? (
          <div className="site-publication-plan__token">
            <span>
              Plan sécurisé
            </span>

            <code>
              {plan.planToken.slice(
                0,
                12
              )}
              …
            </code>
          </div>
        ) : null}

        <div className="site-publication-plan__summary">
          <span>
            {plan?.pages?.toPublish ||
              0}
            {" "}à publier
          </span>

          <span>
            {plan?.pages?.skipped ||
              0}
            {" "}déjà publiée(s)
          </span>

          <span>
            {plan?.pages?.total ||
              0}
            {" "}page(s) au total
          </span>
        </div>

        {plan?.readiness
          ?.failedChecks
          ?.length ? (
          <div className="site-publication-plan__blockers">
            <strong>
              Critères bloquants
            </strong>

            <ul>
              {plan.readiness.failedChecks.map(
                (check) => (
                  <li
                    key={
                      check.id
                    }
                  >
                    {check.category}
                    {" — "}
                    {check.label}
                  </li>
                )
              )}
            </ul>
          </div>
        ) : null}

        <div className="site-publication-plan__pages">
          {(
            plan?.pages?.items ||
            []
          ).map(
            (page) => (
              <article
                key={
                  page.pageId
                }
              >
                <span>
                  {page.sequence}
                </span>

                <div>
                  <strong>
                    {page.title ||
                      page.slug}
                  </strong>

                  <small>
                    /{page.slug}
                  </small>
                </div>

                <span
                  className={
                    page.action ===
                    "publish"
                      ? "site-publication-plan__action site-publication-plan__action--publish"
                      : "site-publication-plan__action"
                  }
                >
                  {page.action ===
                  "publish"
                    ? "Sera publiée"
                    : "Déjà publiée"}
                </span>
              </article>
            )
          )}
        </div>
      </section>

      <div className="site-publication-panel__actions">
        <button
          type="button"
          className="site-publication-panel__refresh"
          onClick={
            load
          }
          disabled={
            operationRunning
          }
        >
          Actualiser
        </button>

        <button
          type="button"
          className="site-publication-panel__unpublish"
          onClick={
            () =>
              execute(
                "unpublish"
              )
          }
          disabled={
            !canUnpublish
          }
        >
          {operation ===
          "unpublish"
            ? "Dépublication…"
            : "Dépublier"}
        </button>

        <button
          type="button"
          className="site-publication-panel__publish"
          onClick={
            () =>
              execute(
                "publish"
              )
          }
          disabled={
            !canPublish
          }
        >
          {operation ===
          "publish"
            ? "Publication…"
            : "Publier le mini-site"}
        </button>
      </div>

      <section className="site-publication-panel__history">
        <header>
          <div>
            <h4>
              Historique
            </h4>

            <span>
              20 dernières opérations
            </span>
          </div>
        </header>

        <PublicationHistory
          items={
            history
          }
        />
      </section>

      <style jsx>{`
        .site-publication-panel {
          margin-top: 20px;
          padding: 24px;
          border: 1px solid #dfe3e8;
          border-radius: 16px;
          background: #fff;
        }

        .site-publication-panel--empty,
        .site-publication-panel--loading {
          display: grid;
          gap: 6px;
          min-height: 100px;
          align-content: center;
        }

        .site-publication-panel__header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .site-publication-panel__header p {
          margin: 0 0 6px;
          color: #69717f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .site-publication-panel__header h3 {
          margin: 0 0 7px;
          font-size: 25px;
        }

        .site-publication-panel__header span {
          color: #69717d;
        }

        .site-publication-panel__badge {
          padding: 8px 11px;
          border-radius: 999px;
          background: #eceef1;
          color: #555d69;
          font-size: 12px;
          font-weight: 800;
        }

        .site-publication-panel__badge--published {
          background: #dff3e5;
          color: #175d2d;
        }

        .site-publication-message {
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 9px;
        }

        .site-publication-message--success {
          background: #e5f5ea;
          color: #145b2b;
        }

        .site-publication-message--error {
          background: #fde9e9;
          color: #8c1e1e;
        }

        .site-publication-panel__progress {
          display: grid;
          grid-template-columns: minmax(170px, auto) minmax(180px, 1fr) auto;
          gap: 14px;
          align-items: center;
          margin-top: 20px;
          padding: 16px;
          border-radius: 11px;
          background: #f6f7f9;
        }

        .site-publication-panel__progress > div:first-child {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .site-publication-progress {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #e1e4e9;
        }

        .site-publication-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #17191f;
          transition: width 300ms ease;
        }

        .site-publication-panel__summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .site-publication-panel__summary article {
          display: grid;
          gap: 7px;
          padding: 14px;
          border-radius: 10px;
          background: #f6f7f9;
        }

        .site-publication-panel__summary span {
          color: #69717d;
          font-size: 12px;
        }

        .site-publication-warning,
        .site-publication-running {
          display: flex;
          gap: 13px;
          margin-top: 17px;
          padding: 15px;
          border-radius: 10px;
        }

        .site-publication-warning {
          display: grid;
          background: #fff0c7;
          color: #705300;
        }

        .site-publication-running {
          align-items: center;
          background: #e8f0ff;
          color: #274f94;
        }

        .site-publication-running > div {
          display: grid;
          gap: 4px;
        }

        .site-publication-running__progress {
          display: grid;
          grid-template-columns: minmax(140px, 1fr) auto;
          gap: 9px;
          align-items: center;
          margin-top: 7px;
        }

        .site-publication-running__progress > span {
          display: block;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background:
            linear-gradient(
              90deg,
              #274f94,
              #5680c8
            );
        }

        .site-publication-running__progress small {
          color: #274f94;
          font-weight: 800;
        }

        .site-publication-running__spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgb(39 79 148 / 0.25);
          border-top-color: #274f94;
          border-radius: 50%;
          animation: publication-spin 0.8s linear infinite;
        }

        .site-publication-plan {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid #dfe3e8;
          border-radius: 12px;
          background: #f8f9fa;
        }

        .site-publication-plan > header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }

        .site-publication-plan h4 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .site-publication-plan header span {
          color: #69717d;
          font-size: 12px;
        }

        .site-publication-plan > header > strong {
          padding: 6px 9px;
          border-radius: 999px;
          background: #e5e8ed;
          font-size: 11px;
        }

        .site-publication-plan__token {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-top: 13px;
          padding: 9px 11px;
          border-radius: 8px;
          background: #e8f0ff;
          color: #274f94;
          font-size: 12px;
        }

        .site-publication-plan__token span {
          font-weight: 800;
        }

        .site-publication-plan__token code {
          color: inherit;
          font-size: 11px;
        }

        .site-publication-plan__summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .site-publication-plan__summary span {
          padding: 6px 9px;
          border-radius: 999px;
          background: #fff;
          font-size: 12px;
          font-weight: 700;
        }

        .site-publication-plan__blockers {
          margin-top: 14px;
          padding: 13px;
          border-radius: 9px;
          background: #fff0c7;
          color: #705300;
        }

        .site-publication-plan__blockers ul {
          margin: 8px 0 0;
          padding-left: 20px;
        }

        .site-publication-plan__pages {
          display: grid;
          gap: 7px;
          max-height: 330px;
          margin-top: 14px;
          overflow: auto;
        }

        .site-publication-plan__pages article {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 8px;
          background: #fff;
        }

        .site-publication-plan__pages article > span:first-child {
          display: grid;
          width: 25px;
          height: 25px;
          place-items: center;
          border-radius: 50%;
          background: #eceef1;
          font-size: 11px;
          font-weight: 800;
        }

        .site-publication-plan__pages article > div {
          display: grid;
          gap: 2px;
        }

        .site-publication-plan__pages small {
          color: #69717d;
        }

        .site-publication-plan__action {
          padding: 5px 8px;
          border-radius: 999px;
          background: #dff3e5;
          color: #175d2d;
          font-size: 11px;
          font-weight: 750;
        }

        .site-publication-plan__action--publish {
          background: #e8f0ff;
          color: #274f94;
        }

        .site-publication-panel__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .site-publication-panel__actions button {
          padding: 10px 14px;
          border: 0;
          border-radius: 8px;
          font-weight: 750;
          cursor: pointer;
        }

        .site-publication-panel__actions button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .site-publication-panel__refresh {
          background: #e7e9ed;
        }

        .site-publication-panel__unpublish {
          background: #f4dcdc;
          color: #7d1f1f;
        }

        .site-publication-panel__publish {
          background: #17191f;
          color: #fff;
        }

        .site-publication-panel__history {
          margin-top: 24px;
          border-top: 1px solid #e2e5ea;
          padding-top: 20px;
        }

        .site-publication-panel__history h4 {
          margin: 0 0 4px;
          font-size: 20px;
        }

        .site-publication-panel__history header span {
          color: #69717d;
          font-size: 12px;
        }

        .site-publication-history {
          display: grid;
          gap: 9px;
          margin-top: 14px;
        }

        .site-publication-history__item {
          display: grid;
          grid-template-columns: minmax(180px, 0.8fr) minmax(250px, 1.2fr) minmax(140px, auto);
          gap: 15px;
          padding: 13px;
          border: 1px solid #ead2d2;
          border-radius: 9px;
          background: #fff8f8;
        }

        .site-publication-history__item--success {
          border-color: #cfe5d5;
          background: #f5fbf7;
        }

        .site-publication-history__item > div {
          display: grid;
          gap: 4px;
        }

        .site-publication-history__item span,
        .site-publication-history__item small {
          color: #69717d;
          font-size: 12px;
        }

        .site-publication-empty {
          margin-top: 14px;
          padding: 24px;
          border: 1px dashed #cdd2da;
          border-radius: 9px;
          color: #69717d;
          text-align: center;
        }

        @keyframes publication-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .site-publication-panel__summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .site-publication-history__item {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .site-publication-panel__header {
            display: grid;
          }

          .site-publication-panel__progress {
            grid-template-columns: 1fr;
          }

          .site-publication-panel__summary {
            grid-template-columns: 1fr;
          }

          .site-publication-panel__actions {
            display: grid;
          }
        }
      `}</style>
    </section>
  );
}
