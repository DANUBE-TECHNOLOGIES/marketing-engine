"use client";

import {
  useState,
} from "react";

async function provisioningRequest(
  action,
  agencyId
) {
  const body = {
    agencyIds: [
      Number(
        agencyId
      ),
    ],

    /*
     * Défense en profondeur.
     *
     * Le proxy frontend impose également
     * ces valeurs côté serveur Next.
     */
    overwrite:
      false,

    publish:
      false,

    globalConfirmation:
      false,
  };

  if (
    action ===
    "preview"
  ) {
    body.dryRun =
      true;
  }

  if (
    action ===
    "execute"
  ) {
    body.dryRun =
      false;
  }

  const response =
    await fetch(
      `/api/network-site-provisioning/${action}`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            body
          ),

        cache:
          "no-store",
      }
    );

  let payload =
    null;

  try {
    payload =
      await response.json();
  } catch {
    payload = {
      message:
        "Réponse invalide du moteur de préparation.",
    };
  }

  if (
    !response.ok
  ) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      (
        typeof payload?.error ===
        "string"
          ? payload.error
          : null
      ) ||
      `Erreur HTTP ${response.status}`;

    const error =
      new Error(
        message
      );

    error.statusCode =
      response.status;

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

function countActions(
  payload
) {
  const candidates = [
    payload?.actions,
    payload?.plan?.actions,
    payload?.items,
    payload?.result?.actions,
    payload?.preview?.actions,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate.length;
    }
  }

  return null;
}

function Summary({
  payload,
}) {
  if (!payload) {
    return null;
  }

  const actions =
    countActions(
      payload
    );

  return (
    <div
      style={{
        display:
          "grid",

        gap:
          "4px",

        fontSize:
          "13px",
      }}
    >
      {actions !== null && (
        <div>
          Actions prévues :{" "}
          <strong>
            {actions}
          </strong>
        </div>
      )}

      {payload?.summary
        ?.created !==
        undefined && (
        <div>
          Créations :{" "}
          <strong>
            {
              payload.summary
                .created
            }
          </strong>
        </div>
      )}

      {payload?.summary
        ?.updated !==
        undefined && (
        <div>
          Mises à jour :{" "}
          <strong>
            {
              payload.summary
                .updated
            }
          </strong>
        </div>
      )}

      {payload?.summary
        ?.skipped !==
        undefined && (
        <div>
          Éléments conservés :{" "}
          <strong>
            {
              payload.summary
                .skipped
            }
          </strong>
        </div>
      )}
    </div>
  );
}

export default function AgencyProvisioningAction({
  agencyId,
  onProvisioned,
}) {
  const [
    state,
    setState,
  ] =
    useState({
      phase:
        "idle",

      preview:
        null,

      result:
        null,

      error:
        null,
    });

  const busy =
    state.phase ===
      "previewing" ||
    state.phase ===
      "executing";

  const canExecute =
    Boolean(
      state.preview
    ) &&
    !busy;

  async function preview() {
    if (
      !agencyId ||
      busy
    ) {
      return;
    }

    setState({
      phase:
        "previewing",

      preview:
        null,

      result:
        null,

      error:
        null,
    });

    try {
      const payload =
        await provisioningRequest(
          "preview",
          agencyId
        );

      setState({
        phase:
          "preview-ready",

        preview:
          payload,

        result:
          null,

        error:
          null,
      });
    } catch (error) {
      setState({
        phase:
          "error",

        preview:
          null,

        result:
          null,

        error:
          error.message ||
          "Impossible d'analyser le mini-site.",
      });
    }
  }

  async function execute() {
    if (
      !agencyId ||
      !state.preview ||
      busy
    ) {
      return;
    }

    setState(
      (
        previous
      ) => ({
        ...previous,

        phase:
          "executing",

        error:
          null,
      })
    );

    try {
      const payload =
        await provisioningRequest(
          "execute",
          agencyId
        );

      setState({
        phase:
          "done",

        preview:
          null,

        result:
          payload,

        error:
          null,
      });

      if (
        typeof onProvisioned ===
        "function"
      ) {
        await onProvisioned(
          payload
        );
      }
    } catch (error) {
      setState(
        (
          previous
        ) => ({
          ...previous,

          phase:
            "error",

          error:
            error.message ||
            "La préparation du mini-site a échoué.",
        })
      );
    }
  }

  function reset() {
    if (busy) {
      return;
    }

    setState({
      phase:
        "idle",

      preview:
        null,

      result:
        null,

      error:
        null,
    });
  }

  return (
    <section
      style={{
        display:
          "grid",

        gap:
          "12px",

        padding:
          "16px",

        border:
          "1px solid #bfdbfe",

        borderRadius:
          "14px",

        background:
          "#eff6ff",
      }}
    >
      <div>
        <strong
          style={{
            display:
              "block",

            fontSize:
              "15px",
          }}
        >
          Préparation du mini-site
        </strong>

        <p
          style={{
            margin:
              "5px 0 0",

            fontSize:
              "13px",

            lineHeight:
              1.5,

            opacity:
              0.75,
          }}
        >
          Le Website Engine analyse puis complète
          uniquement les éléments manquants.
          Les contenus existants sont conservés.
          Aucune publication n'est déclenchée.
        </p>
      </div>

      {state.phase ===
        "idle" && (
        <button
          type="button"
          onClick={
            preview
          }
          disabled={
            busy
          }
        >
          Analyser la préparation
        </button>
      )}

      {state.phase ===
        "previewing" && (
        <div
          style={{
            fontSize:
              "13px",
          }}
        >
          Analyse du mini-site…
        </div>
      )}

      {state.preview && (
        <div
          style={{
            display:
              "grid",

            gap:
              "10px",

            padding:
              "12px",

            border:
              "1px solid #dbeafe",

            borderRadius:
              "10px",

            background:
              "#ffffff",
          }}
        >
          <div>
            <strong>
              Prévisualisation prête
            </strong>

            <p
              style={{
                margin:
                  "4px 0 0",

                fontSize:
                  "13px",

                lineHeight:
                  1.45,

                opacity:
                  0.75,
              }}
            >
              Aucune donnée n'a été modifiée.
              Tu peux maintenant lancer la
              préparation réelle.
            </p>
          </div>

          <Summary
            payload={
              state.preview
            }
          />

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
                execute
              }
              disabled={
                !canExecute
              }
            >
              {
                state.phase ===
                "executing"
                  ? "Préparation…"
                  : "Préparer le mini-site"
              }
            </button>

            <button
              type="button"
              onClick={
                reset
              }
              disabled={
                busy
              }
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {state.result && (
        <div
          style={{
            display:
              "grid",

            gap:
              "8px",

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
          <strong>
            Mini-site préparé
          </strong>

          <div
            style={{
              fontSize:
                "13px",

              lineHeight:
                1.45,
            }}
          >
            Les éléments manquants ont été préparés.
            Le Launch Manager peut maintenant
            recalculer le readiness.
          </div>

          <Summary
            payload={
              state.result
            }
          />

          <div>
            <button
              type="button"
              onClick={
                reset
              }
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {state.error && (
        <div
          style={{
            display:
              "grid",

            gap:
              "8px",

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
          <strong>
            Préparation impossible
          </strong>

          <div
            style={{
              fontSize:
                "13px",
            }}
          >
            {state.error}
          </div>

          <div>
            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                preview
              }
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          paddingTop:
            "8px",

          borderTop:
            "1px solid #dbeafe",

          fontSize:
            "12px",

          opacity:
            0.65,
        }}
      >
        Sécurité : overwrite désactivé ·
        publication désactivée ·
        prévisualisation obligatoire.
      </div>
    </section>
  );
}
