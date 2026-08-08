"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchBrandReadiness,
  groupReadinessChecks,
} from "../../lib/brand-studio/readiness-api";

import SitePublicationPanel from "./SitePublicationPanel";

function scoreLabel(
  status
) {
  if (
    status ===
    "ready"
  ) {
    return "Prêt à publier";
  }

  if (
    status ===
    "almost-ready"
  ) {
    return "Presque prêt";
  }

  if (
    status ===
    "in-progress"
  ) {
    return "Configuration en cours";
  }

  return "Configuration incomplète";
}

function actionLabel(
  action
) {
  if (
    action ===
    "identity"
  ) {
    return "Configurer l’identité";
  }

  if (
    action ===
    "media"
  ) {
    return "Configurer les médias";
  }

  if (
    action ===
    "legal"
  ) {
    return "Configurer le juridique";
  }

  return "Ouvrir le Website Builder";
}

function ReadinessCheck({
  check,
  onAction,
}) {
  return (
    <article
      className={
        check.ready
          ? "brand-readiness-check brand-readiness-check--ready"
          : "brand-readiness-check"
      }
    >
      <div className="brand-readiness-check__icon">
        {check.ready
          ? "✓"
          : "!"}
      </div>

      <div className="brand-readiness-check__content">
        <div>
          <strong>
            {check.label}
          </strong>

          {!check.required ? (
            <span>
              Facultatif
            </span>
          ) : null}
        </div>

        {check.details ? (
          <small>
            {check.details}
          </small>
        ) : null}
      </div>

      {!check.ready ? (
        <button
          type="button"
          onClick={
            () =>
              onAction(
                check.action
              )
          }
        >
          {actionLabel(
            check.action
          )}
        </button>
      ) : null}
    </article>
  );
}

export default function BrandReadinessPanel({
  agencyId,
  agency,
  onOpenSection,
}) {
  const [
    readiness,
    setReadiness,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(null);

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchBrandReadiness({
              agencyId,

              siteSlug:
                agency?.siteSlug ||
                null,
            });

          setReadiness(
            result
          );
        } catch (loadError) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        agencyId,
        agency?.siteSlug,
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

  const groups =
    useMemo(
      () =>
        groupReadinessChecks(
          readiness?.checks ||
          []
        ),
      [
        readiness,
      ]
    );

  function handleAction(
    action
  ) {
    if (
      [
        "identity",
        "media",
        "legal",
      ].includes(action)
    ) {
      onOpenSection(
        action
      );

      return;
    }

    window.location.href =
      agency?.siteId
        ? `/website-builder/editor/${agency.siteId}`
        : "/website-builder";
  }

  if (loading) {
    return (
      <section className="brand-readiness-loading">
        Analyse de la préparation du mini-site…
      </section>
    );
  }

  if (error) {
    return (
      <section className="brand-readiness-error">
        <strong>
          La préparation n’a pas pu être analysée.
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={
            load
          }
        >
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <section className="brand-readiness">
      <header className="brand-readiness__header">
        <div>
          <p>
            Préparation du mini-site
          </p>

          <h2>
            {agency?.name ||
              readiness?.site?.name ||
              `Agence #${agencyId}`}
          </h2>

          <span>
            Vérification automatique des éléments nécessaires
            avant mise en ligne.
          </span>
        </div>

        <div
          className={
            `brand-readiness-score brand-readiness-score--${
              readiness?.status ||
              "incomplete"
            }`
          }
        >
          <strong>
            {readiness?.score ||
              0} %
          </strong>

          <span>
            {scoreLabel(
              readiness?.status
            )}
          </span>
        </div>
      </header>

      <div className="brand-readiness__progress">
        <div
          style={{
            width:
              `${readiness?.score || 0}%`,
          }}
        />
      </div>

      <div className="brand-readiness__summary">
        <article>
          <span>
            Obligatoires
          </span>

          <strong>
            {readiness?.summary
              ?.completed ||
              0}
            /
            {readiness?.summary
              ?.required ||
              0}
          </strong>
        </article>

        <article>
          <span>
            Éléments manquants
          </span>

          <strong>
            {readiness?.summary
              ?.missing ||
              0}
          </strong>
        </article>

        <article>
          <span>
            Routes publiques
          </span>

          <strong>
            {readiness?.summary
              ?.operationalRoutes ||
              0}
            /
            {readiness?.summary
              ?.routeCount ||
              0}
          </strong>
        </article>

        <article>
          <span>
            Pages du site
          </span>

          <strong>
            {readiness?.site
              ?.pageCount ||
              0}
          </strong>
        </article>
      </div>

      <div className="brand-readiness__groups">
        {groups.map(
          (group) => (
            <section
              key={
                group.category
              }
              className="brand-readiness-group"
            >
              <header>
                <h3>
                  {group.category}
                </h3>

                <span>
                  {group.completed}
                  /
                  {group.count}
                </span>
              </header>

              <div>
                {group.items.map(
                  (check) => (
                    <ReadinessCheck
                      key={
                        check.id
                      }
                      check={
                        check
                      }
                      onAction={
                        handleAction
                      }
                    />
                  )
                )}
              </div>
            </section>
          )
        )}
      </div>

      <section className="brand-readiness-routes">
        <header>
          <div>
            <h3>
              Routes publiques
            </h3>

            <p>
              Contrôle HTTP des pages essentielles du mini-site.
            </p>
          </div>

          <button
            type="button"
            onClick={
              load
            }
          >
            Actualiser
          </button>
        </header>

        <div>
          {(
            readiness?.publicRoutes ||
            []
          ).map(
            (route) => (
              <article
                key={
                  route.path
                }
              >
                <span
                  className={
                    route.operational
                      ? "brand-route-status brand-route-status--ready"
                      : "brand-route-status"
                  }
                >
                  {route.status}
                </span>

                <code>
                  {route.path}
                </code>

                {route.operational ? (
                  <a
                    href={
                      route.path
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir
                  </a>
                ) : (
                  <strong>
                    Indisponible
                  </strong>
                )}
              </article>
            )
          )}
        </div>
      </section>

      {readiness?.status ===
      "ready" ? (
        <aside className="brand-readiness-ready">
          <div>
            <strong>
              Le mini-site est prêt.
            </strong>

            <span>
              Tous les éléments obligatoires sont configurés.
            </span>
          </div>

          {agency?.siteSlug ? (
            <a
              href={
                `/sites/${agency.siteSlug}`
              }
              target="_blank"
              rel="noreferrer"
            >
              Voir le mini-site
            </a>
          ) : null}
        </aside>
      ) : null}


      <SitePublicationPanel
        siteId={
          agency?.siteId ||
          readiness?.site?.id ||
          null
        }
        siteSlug={
          agency?.siteSlug ||
          readiness?.siteSlug ||
          null
        }
        readinessScore={
          readiness?.score ||
          0
        }
        readinessMissing={
          readiness?.summary
            ?.missing ||
          0
        }
        onChanged={
          load
        }
      />

      <style jsx>{`
        .brand-readiness,
        .brand-readiness-loading,
        .brand-readiness-error {
          padding: 28px;
          border: 1px solid #dfe3e8;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 20px 50px rgb(20 25 35 / 0.06);
        }

        .brand-readiness-loading {
          min-height: 160px;
        }

        .brand-readiness-error {
          display: grid;
          gap: 10px;
          color: #8a2020;
        }

        .brand-readiness-error button {
          justify-self: start;
          padding: 10px 14px;
          border: 0;
          border-radius: 8px;
          background: #17191f;
          color: #fff;
          cursor: pointer;
        }

        .brand-readiness__header {
          display: flex;
          justify-content: space-between;
          gap: 28px;
          align-items: flex-start;
        }

        .brand-readiness__header p {
          margin: 0 0 7px;
          color: #69717f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .brand-readiness__header h2 {
          margin: 0 0 10px;
          font-size: clamp(28px, 4vw, 42px);
        }

        .brand-readiness__header > div:first-child > span {
          color: #606875;
        }

        .brand-readiness-score {
          display: grid;
          justify-items: end;
          gap: 4px;
          min-width: 150px;
          padding: 16px 18px;
          border-radius: 13px;
          background: #f0f1f3;
        }

        .brand-readiness-score strong {
          font-size: 32px;
        }

        .brand-readiness-score span {
          font-size: 12px;
          font-weight: 750;
        }

        .brand-readiness-score--ready {
          background: #dff3e5;
          color: #175d2d;
        }

        .brand-readiness-score--almost-ready {
          background: #e8f0ff;
          color: #274f94;
        }

        .brand-readiness-score--in-progress {
          background: #fff0c7;
          color: #795a00;
        }

        .brand-readiness-score--incomplete {
          background: #fdeaea;
          color: #8a2020;
        }

        .brand-readiness__progress {
          height: 10px;
          margin: 22px 0;
          overflow: hidden;
          border-radius: 999px;
          background: #e8eaee;
        }

        .brand-readiness__progress > div {
          height: 100%;
          border-radius: inherit;
          background: #17191f;
          transition: width 300ms ease;
        }

        .brand-readiness__summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 22px;
        }

        .brand-readiness__summary article {
          display: grid;
          gap: 7px;
          padding: 16px;
          border-radius: 11px;
          background: #f5f6f8;
        }

        .brand-readiness__summary span {
          color: #69717d;
          font-size: 12px;
        }

        .brand-readiness__summary strong {
          font-size: 24px;
        }

        .brand-readiness__groups {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .brand-readiness-group {
          padding: 20px;
          border: 1px solid #e0e4e9;
          border-radius: 13px;
          background: #fafbfc;
        }

        .brand-readiness-group > header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 13px;
        }

        .brand-readiness-group h3 {
          margin: 0;
        }

        .brand-readiness-group > header span {
          padding: 4px 8px;
          border-radius: 999px;
          background: #e5e8ed;
          font-size: 12px;
          font-weight: 750;
        }

        .brand-readiness-group > div {
          display: grid;
          gap: 9px;
        }

        .brand-readiness-check {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          gap: 11px;
          align-items: center;
          padding: 11px;
          border: 1px solid #efd4d4;
          border-radius: 9px;
          background: #fff8f8;
        }

        .brand-readiness-check--ready {
          border-color: #cce5d4;
          background: #f4fbf6;
        }

        .brand-readiness-check__icon {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 50%;
          background: #f4cece;
          color: #842020;
          font-weight: 900;
        }

        .brand-readiness-check--ready
        .brand-readiness-check__icon {
          background: #ccebd5;
          color: #155d2d;
        }

        .brand-readiness-check__content {
          display: grid;
          gap: 3px;
        }

        .brand-readiness-check__content > div {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .brand-readiness-check__content span {
          padding: 3px 6px;
          border-radius: 999px;
          background: #eceef1;
          color: #646c78;
          font-size: 10px;
          font-weight: 750;
        }

        .brand-readiness-check__content small {
          color: #69717d;
        }

        .brand-readiness-check button {
          padding: 8px 10px;
          border: 0;
          border-radius: 7px;
          background: #17191f;
          color: #fff;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .brand-readiness-routes {
          margin-top: 20px;
          padding: 21px;
          border: 1px solid #e0e4e9;
          border-radius: 13px;
        }

        .brand-readiness-routes > header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 15px;
        }

        .brand-readiness-routes h3 {
          margin: 0 0 4px;
        }

        .brand-readiness-routes p {
          margin: 0;
          color: #69717d;
        }

        .brand-readiness-routes button {
          align-self: flex-start;
          padding: 9px 12px;
          border: 0;
          border-radius: 8px;
          background: #e7e9ed;
          font-weight: 750;
          cursor: pointer;
        }

        .brand-readiness-routes > div {
          display: grid;
          gap: 8px;
        }

        .brand-readiness-routes article {
          display: grid;
          grid-template-columns: 55px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          background: #f6f7f9;
        }

        .brand-readiness-routes code {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brand-readiness-routes a {
          color: #17191f;
          font-weight: 750;
        }

        .brand-route-status {
          padding: 5px 7px;
          border-radius: 999px;
          background: #f3d7d7;
          color: #842020;
          text-align: center;
          font-size: 11px;
          font-weight: 800;
        }

        .brand-route-status--ready {
          background: #d7eddd;
          color: #155d2d;
        }

        .brand-readiness-ready {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          margin-top: 20px;
          padding: 19px 21px;
          border-radius: 13px;
          background: #17191f;
          color: #fff;
        }

        .brand-readiness-ready > div {
          display: grid;
          gap: 4px;
        }

        .brand-readiness-ready span {
          color: #d0d4db;
        }

        .brand-readiness-ready a {
          padding: 10px 14px;
          border-radius: 8px;
          background: #fff;
          color: #17191f;
          font-weight: 750;
          text-decoration: none;
        }

        @media (max-width: 980px) {
          .brand-readiness__summary,
          .brand-readiness__groups {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .brand-readiness {
            padding: 20px;
          }

          .brand-readiness__header,
          .brand-readiness-ready {
            display: grid;
          }

          .brand-readiness-score {
            justify-items: start;
          }

          .brand-readiness__summary,
          .brand-readiness__groups {
            grid-template-columns: 1fr;
          }

          .brand-readiness-check {
            grid-template-columns: 34px 1fr;
          }

          .brand-readiness-check button {
            grid-column: 1 / -1;
          }

          .brand-readiness-routes article {
            grid-template-columns: 55px minmax(0, 1fr);
          }

          .brand-readiness-routes article > :last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </section>
  );
}
