"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AgencyProvisioningAction from "./AgencyProvisioningAction";

const PUBLIC_ORIGIN =
  String(
    process.env
      .NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).replace(
    /\/+$/g,
    ""
  );

async function jsonRequest(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",

        ...options,

        headers: {
          accept:
            "application/json",

          ...(
            options.body
              ? {
                  "content-type":
                    "application/json",
                }
              : {}
          ),

          ...(
            options.headers ||
            {}
          ),
        },
      }
    );

  const contentType =
    response.headers.get(
      "content-type"
    ) ||
    "";

  const payload =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const error =
      new Error(
        payload?.message ||
        payload?.error?.message ||
        (
          typeof payload ===
          "string"
            ? payload
            : "Opération impossible."
        )
      );

    error.statusCode =
      response.status;

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

function extractPlanToken(
  payload
) {
  return (
    payload?.planToken ||
    payload?.token ||
    payload?.publicationPlanToken ||
    payload?.plan?.token ||
    payload?.plan?.planToken ||
    null
  );
}

function siteUrl(
  site
) {
  if (!site?.slug) {
    return null;
  }

  return (
    `${PUBLIC_ORIGIN}/agence/${site.slug}`
  );
}

function scoreLabel(
  score
) {
  return (
    typeof score ===
    "number"
      ? `${score}/100`
      : "—"
  );
}

function readinessLabel(
  item
) {
  if (
    item.readiness
      ?.ready
  ) {
    return "Prêt";
  }

  const blockers =
    item.readiness
      ?.blockers ||
    [];

  if (!blockers.length) {
    return "À vérifier";
  }

  return (
    `${blockers.length} blocage${
      blockers.length >
      1
        ? "s"
        : ""
    }`
  );
}

export default function AgencyLaunchManager() {
  const [
    network,
    setNetwork,
  ] =
    useState(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      null
    );

  const [
    selected,
    setSelected,
  ] =
    useState(
      null
    );

  const [
    detail,
    setDetail,
  ] =
    useState(
      null
    );

  const [
    publication,
    setPublication,
  ] =
    useState(
      {
        status:
          null,

        history:
          [],

        plan:
          null,

        planToken:
          null,
      }
    );

  const [
    operation,
    setOperation,
  ] =
    useState(
      {
        running:
          false,

        action:
          null,

        message:
          null,

        error:
          null,
      }
    );

  async function loadNetwork() {
    setLoading(
      true
    );

    setError(
      null
    );

    try {
      const payload =
        await jsonRequest(
          "/api/agency-launch/network"
        );

      setNetwork(
        payload
      );
    } catch (requestError) {
      setError(
        requestError.message
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function loadDetail(
    item
  ) {
    setSelected(
      item
    );

    setDetail(
      null
    );

    setPublication({
      status:
        null,

      history:
        [],

      plan:
        null,

      planToken:
        null,
    });

    setOperation({
      running:
        false,

      action:
        null,

      message:
        null,

      error:
        null,
    });

    try {
      const readiness =
        await jsonRequest(
          `/api/agency-launch/agencies/${item.agency.id}/readiness`
        );

      setDetail(
        readiness
      );

      if (
        readiness.site
          ?.id
      ) {
        await loadPublicationData(
          readiness.site.id
        );
      }
    } catch (requestError) {
      setOperation({
        running:
          false,

        action:
          null,

        message:
          null,

        error:
          requestError.message,
      });
    }
  }

  async function loadPublicationData(
    siteId
  ) {
    const [
      status,
      history,
    ] =
      await Promise.all([
        jsonRequest(
          `/api/site-publication/sites/${siteId}/status`
        ),

        jsonRequest(
          `/api/site-publication/sites/${siteId}/history?limit=20`
        ),
      ]);

    setPublication(
      (
        previous
      ) => ({
        ...previous,

        status,

        history:
          history?.items ||
          history ||
          [],
      })
    );
  }

  async function refreshSelected() {
    if (
      !selected?.agency
        ?.id
    ) {
      return;
    }

    const readiness =
      await jsonRequest(
        `/api/agency-launch/agencies/${selected.agency.id}/readiness`
      );

    setDetail(
      readiness
    );

    if (
      readiness.site
        ?.id
    ) {
      await loadPublicationData(
        readiness.site.id
      );
    }

    await loadNetwork();
  }

  async function preparePublication() {
    const siteId =
      detail?.site
        ?.id;

    if (!siteId) {
      return;
    }

    setOperation({
      running:
        true,

      action:
        "plan",

      message:
        "Préparation du plan de publication…",

      error:
        null,
    });

    try {
      /*
       * Le backend possède son propre contrat de méthode.
       * POST est utilisé pour les environnements récents.
       * Si le serveur expose encore GET, le fallback reste compatible.
       */
      let plan;

      try {
        plan =
          await jsonRequest(
            `/api/site-publication/sites/${siteId}/plan`,
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  {}
                ),
            }
          );
      } catch (requestError) {
        if (
          requestError.statusCode !==
            404 &&
          requestError.statusCode !==
            405
        ) {
          throw requestError;
        }

        plan =
          await jsonRequest(
            `/api/site-publication/sites/${siteId}/plan`
          );
      }

      const planToken =
        extractPlanToken(
          plan
        );

      if (!planToken) {
        throw new Error(
          "Le plan a été généré mais aucun planToken n’a été retourné."
        );
      }

      setPublication(
        (
          previous
        ) => ({
          ...previous,

          plan,

          planToken,
        })
      );

      setOperation({
        running:
          false,

        action:
          null,

        message:
          "Plan de publication prêt.",

        error:
          null,
      });
    } catch (requestError) {
      setOperation({
        running:
          false,

        action:
          null,

        message:
          null,

        error:
          requestError.message,
      });
    }
  }

  async function publish() {
    const siteId =
      detail?.site
        ?.id;

    const planToken =
      publication
        .planToken;

    if (
      !siteId ||
      !planToken
    ) {
      return;
    }

    setOperation({
      running:
        true,

      action:
        "publish",

      message:
        "Publication du mini-site…",

      error:
        null,
    });

    try {
      await jsonRequest(
        `/api/site-publication/sites/${siteId}/publish`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              planToken,
            }),
        }
      );

      setPublication(
        (
          previous
        ) => ({
          ...previous,

          plan:
            null,

          planToken:
            null,
        })
      );

      setOperation({
        running:
          false,

        action:
          null,

        message:
          "Mini-site publié.",

        error:
          null,
      });

      await refreshSelected();
    } catch (requestError) {
      setOperation({
        running:
          false,

        action:
          null,

        message:
          null,

        error:
          requestError.message,
      });
    }
  }

  async function unpublish() {
    const siteId =
      detail?.site
        ?.id;

    if (!siteId) {
      return;
    }

    const accepted =
      window.confirm(
        "Dépublier ce mini-site ? Il ne sera plus accessible publiquement."
      );

    if (!accepted) {
      return;
    }

    setOperation({
      running:
        true,

      action:
        "unpublish",

      message:
        "Dépublication du mini-site…",

      error:
        null,
    });

    try {
      await jsonRequest(
        `/api/site-publication/sites/${siteId}/unpublish`,
        {
          method:
            "POST",

          body:
            JSON.stringify(
              {}
            ),
        }
      );

      setPublication(
        (
          previous
        ) => ({
          ...previous,

          plan:
            null,

          planToken:
            null,
        })
      );

      setOperation({
        running:
          false,

        action:
          null,

        message:
          "Mini-site dépublié.",

        error:
          null,
      });

      await refreshSelected();
    } catch (requestError) {
      setOperation({
        running:
          false,

        action:
          null,

        message:
          null,

        error:
          requestError.message,
      });
    }
  }

  useEffect(
    () => {
      loadNetwork();
    },
    []
  );

  const summary =
    useMemo(
      () => ({
        total:
          network?.total ||
          0,

        ready:
          network?.ready ||
          0,

        published:
          network
            ?.published ||
          0,
      }),
      [
        network,
      ]
    );

  if (loading) {
    return (
      <Panel>
        Chargement du Launch Manager…
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <h2>
          Mise en ligne des mini-sites
        </h2>

        <ErrorMessage>
          {error}
        </ErrorMessage>

        <button
          type="button"
          onClick={
            loadNetwork
          }
        >
          Réessayer
        </button>
      </Panel>
    );
  }

  const items =
    network?.items ||
    [];

  return (
    <div
      style={{
        display:
          "grid",

        gap:
          "24px",
      }}
    >
      <div>
        <h2
          style={{
            margin:
              "0 0 8px",
          }}
        >
          Mise en ligne des mini-sites
        </h2>

        <p
          style={{
            margin:
              0,

            opacity:
              0.7,
          }}
        >
          Publication progressive des sites agences.
        </p>
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",

          gap:
            "12px",
        }}
      >
        <SummaryCard
          label="Agences"
          value={
            summary.total
          }
        />

        <SummaryCard
          label="Prêtes"
          value={
            summary.ready
          }
        />

        <SummaryCard
          label="En ligne"
          value={
            summary.published
          }
        />
      </div>

      <Panel
        padding="0"
      >
        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width:
                "100%",

              minWidth:
                "900px",

              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr>
                <Head>
                  Agence
                </Head>

                <Head>
                  Ville
                </Head>

                <Head>
                  Score
                </Head>

                <Head>
                  Grade
                </Head>

                <Head>
                  Préparation
                </Head>

                <Head>
                  Publication
                </Head>

                <Head>
                  Actions
                </Head>
              </tr>
            </thead>

            <tbody>
              {items.map(
                (
                  item
                ) => {
                  const url =
                    siteUrl(
                      item.site
                    );

                  return (
                    <tr
                      key={
                        item.agency
                          ?.id
                      }
                      style={{
                        borderTop:
                          "1px solid #e5e7eb",
                      }}
                    >
                      <Cell>
                        <strong>
                          {
                            item.agency
                              ?.name ||
                            `Agence ${item.agency?.id}`
                          }
                        </strong>
                      </Cell>

                      <Cell>
                        {
                          item.agency
                            ?.city ||
                          "—"
                        }
                      </Cell>

                      <Cell>
                        {scoreLabel(
                          item.readiness
                            ?.score
                        )}
                      </Cell>

                      <Cell>
                        {
                          item.readiness
                            ?.grade ||
                          "—"
                        }
                      </Cell>

                      <Cell>
                        <Badge
                          positive={
                            item.readiness
                              ?.ready ===
                            true
                          }
                        >
                          {readinessLabel(
                            item
                          )}
                        </Badge>
                      </Cell>

                      <Cell>
                        <Badge
                          positive={
                            item.site
                              ?.published ===
                            true
                          }
                        >
                          {
                            item.site
                              ?.published
                              ? "En ligne"
                              : "Non publié"
                          }
                        </Badge>
                      </Cell>

                      <Cell>
                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              "8px",

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={
                              () =>
                                loadDetail(
                                  item
                                )
                            }
                          >
                            Gérer
                          </button>

                          {url && (
                            <a
                              href={
                                url
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir
                            </a>
                          )}
                        </div>
                      </Cell>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <LaunchDetail
          selected={
            selected
          }
          detail={
            detail
          }
          publication={
            publication
          }
          operation={
            operation
          }
          preparePublication={
            preparePublication
          }
          publish={
            publish
          }
          unpublish={
            unpublish
          }
          refresh={
            refreshSelected
          }
          close={
            () => {
              setSelected(
                null
              );

              setDetail(
                null
              );
            }
          }
        />
      )}
    </div>
  );
}

function LaunchDetail({
  selected,
  detail,
  publication,
  operation,
  preparePublication,
  publish,
  unpublish,
  refresh,
  close,
}) {
  if (!detail) {
    return (
      <Panel>
        Chargement…
      </Panel>
    );
  }

  const published =
    detail.site
      ?.published ===
    true;

  const ready =
    detail.readiness
      ?.ready ===
    true;

  const publicUrl =
    siteUrl(
      detail.site
    );

  return (
    <Panel>
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            "16px",

          flexWrap:
            "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin:
                "0 0 6px",
            }}
          >
            {
              detail.agency
                ?.name ||
              selected.agency
                ?.name
            }
          </h3>

          <div>
            Score{" "}
            <strong>
              {
                detail.readiness
                  ?.score
              }
              /100
            </strong>
            {" · "}
            Grade{" "}
            <strong>
              {
                detail.readiness
                  ?.grade
              }
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={
            close
          }
        >
          Fermer
        </button>
      </div>

      <div
        style={{
          display:
            "flex",

          gap:
            "10px",

          flexWrap:
            "wrap",

          margin:
            "20px 0",
        }}
      >
        <Badge
          positive={
            ready
          }
        >
          {
            ready
              ? "Prêt à publier"
              : "Préparation incomplète"
          }
        </Badge>

        <Badge
          positive={
            published
          }
        >
          {
            published
              ? "En ligne"
              : "Hors ligne"
          }
        </Badge>
      </div>

      {!published && !ready && (
        <div
          style={{
            marginBottom:
              "20px",
          }}
        >
          <AgencyProvisioningAction
            agencyId={
              detail.agency?.id
            }
            onProvisioned={
              refresh
            }
          />
        </div>
      )}

      {detail.readiness
        ?.blockers
        ?.length >
      0 && (
        <div
          style={{
            marginBottom:
              "20px",
          }}
        >
          <strong>
            Blocages
          </strong>

          <ul>
            {detail.readiness
              .blockers
              .map(
                (
                  blocker
                ) => (
                  <li
                    key={
                      blocker.code
                    }
                  >
                    {
                      blocker.label
                    }
                  </li>
                )
              )}
          </ul>
        </div>
      )}
<div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",

          gap:
            "10px",

          marginBottom:
            "24px",
        }}
      >
        {detail.checks
          ?.map(
            (
              check
            ) => (
              <div
                key={
                  check.code
                }
                style={{
                  padding:
                    "12px",

                  border:
                    "1px solid #e5e7eb",

                  borderRadius:
                    "12px",
                }}
              >
                <strong>
                  {
                    check.label
                  }
                </strong>

                <div
                  style={{
                    marginTop:
                      "6px",
                  }}
                >
                  <Badge
                    positive={
                      check.passed
                    }
                  >
                    {
                      check.passed
                        ? "OK"
                        : "À corriger"
                    }
                  </Badge>
                </div>
              </div>
            )
          )}
      </div>

      <div
        style={{
          display:
            "flex",

          gap:
            "10px",

          flexWrap:
            "wrap",

          paddingTop:
            "18px",

          borderTop:
            "1px solid #e5e7eb",
        }}
      >
        {!published && (
          <>
            <button
              type="button"
              disabled={
                !ready ||
                operation.running
              }
              onClick={
                preparePublication
              }
            >
              Préparer la publication
            </button>

            <button
              type="button"
              disabled={
                !ready ||
                !publication
                  .planToken ||
                operation.running
              }
              onClick={
                publish
              }
            >
              Publier
            </button>
          </>
        )}

        {published && (
          <button
            type="button"
            disabled={
              operation.running
            }
            onClick={
              unpublish
            }
          >
            Dépublier
          </button>
        )}

        <button
          type="button"
          disabled={
            operation.running
          }
          onClick={
            refresh
          }
        >
          Actualiser
        </button>

        {publicUrl && (
          <a
            href={
              publicUrl
            }
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir le mini-site
          </a>
        )}
      </div>

      {operation.message && (
        <SuccessMessage>
          {
            operation.message
          }
        </SuccessMessage>
      )}

      {operation.error && (
        <ErrorMessage>
          {
            operation.error
          }
        </ErrorMessage>
      )}

      {publication.plan && (
        <div
          style={{
            marginTop:
              "20px",

            padding:
              "14px",

            border:
              "1px solid #dbeafe",

            background:
              "#eff6ff",

            borderRadius:
              "12px",
          }}
        >
          <strong>
            Plan de publication préparé
          </strong>

          <div
            style={{
              marginTop:
                "6px",

              fontSize:
                "13px",
            }}
          >
            Le bouton Publier est maintenant disponible.
          </div>
        </div>
      )}

      <History
        items={
          publication.history
        }
      />
    </Panel>
  );
}

function History({
  items,
}) {
  const history =
    Array.isArray(
      items
    )
      ? items
      : [];

  return (
    <div
      style={{
        marginTop:
          "28px",
      }}
    >
      <h4>
        Historique de publication
      </h4>

      {!history.length ? (
        <p
          style={{
            opacity:
              0.65,
          }}
        >
          Aucun historique disponible.
        </p>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              "8px",
          }}
        >
          {history
            .slice(
              0,
              10
            )
            .map(
              (
                entry,
                index
              ) => (
                <div
                  key={
                    entry.id ||
                    `${entry.createdAt}-${index}`
                  }
                  style={{
                    padding:
                      "10px 12px",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "10px",

                    fontSize:
                      "13px",
                  }}
                >
                  <strong>
                    {
                      entry.action ||
                      entry.operation ||
                      entry.status ||
                      "Opération"
                    }
                  </strong>

                  {entry.createdAt && (
                    <span>
                      {" · "}
                      {
                        new Date(
                          entry.createdAt
                        ).toLocaleString(
                          "fr-FR"
                        )
                      }
                    </span>
                  )}
                </div>
              )
            )}
        </div>
      )}
    </div>
  );
}

function Panel({
  children,
  padding = "20px",
}) {
  return (
    <section
      style={{
        padding,

        background:
          "#ffffff",

        border:
          "1px solid #e5e7eb",

        borderRadius:
          "16px",
      }}
    >
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
}) {
  return (
    <Panel>
      <div
        style={{
          fontSize:
            "13px",

          opacity:
            0.65,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "6px",

          fontSize:
            "28px",

          fontWeight:
            700,
        }}
      >
        {value}
      </div>
    </Panel>
  );
}

function Badge({
  positive,
  children,
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",

        padding:
          "5px 9px",

        borderRadius:
          "999px",

        fontSize:
          "12px",

        fontWeight:
          700,

        background:
          positive
            ? "#ecfdf5"
            : "#fff7ed",

        color:
          positive
            ? "#047857"
            : "#c2410c",
      }}
    >
      {children}
    </span>
  );
}

function Head({
  children,
}) {
  return (
    <th
      style={{
        padding:
          "14px",

        textAlign:
          "left",

        fontSize:
          "12px",

        opacity:
          0.68,
      }}
    >
      {children}
    </th>
  );
}

function Cell({
  children,
}) {
  return (
    <td
      style={{
        padding:
          "14px",

        verticalAlign:
          "top",
      }}
    >
      {children}
    </td>
  );
}

function SuccessMessage({
  children,
}) {
  return (
    <div
      style={{
        marginTop:
          "16px",

        padding:
          "12px",

        borderRadius:
          "10px",

        background:
          "#ecfdf5",

        color:
          "#047857",
      }}
    >
      {children}
    </div>
  );
}

function ErrorMessage({
  children,
}) {
  return (
    <div
      style={{
        marginTop:
          "16px",

        padding:
          "12px",

        borderRadius:
          "10px",

        background:
          "#fef2f2",

        color:
          "#b91c1c",
      }}
    >
      {children}
    </div>
  );
}
