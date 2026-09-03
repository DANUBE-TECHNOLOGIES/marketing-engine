"use client";

import {
  useMemo,
  useState,
} from "react";

const CHECKS = Object.freeze([
  {
    id:
      "session",

    label:
      "Session utilisateur",

    url:
      "/session",

    acceptedStatuses: [
      200,
      204,
    ],
  },

  {
    id:
      "sites",

    label:
      "Liste des mini-sites",

    url:
      "/api/website-builder/sites",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "assetsHealth",

    label:
      "Service médiathèque",

    url:
      "/api/brand-assets/health",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "brandHealth",

    label:
      "Service identité visuelle",

    url:
      "/api/brand-profile/health",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "legalHealth",

    label:
      "Service juridique",

    url:
      "/api/legal-profile/health",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "assetsRead",

    label:
      "Lecture de la médiathèque société",

    url:
      "/api/brand-assets?limit=1",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "brandRead",

    label:
      "Lecture du profil de marque société",

    url:
      "/api/brand-profile",

    acceptedStatuses: [
      200,
    ],
  },

  {
    id:
      "legalRead",

    label:
      "Lecture du profil juridique société",

    url:
      "/api/legal-profile",

    acceptedStatuses: [
      200,
    ],
  },
]);

function parseBodyPreview(
  text
) {
  if (!text) {
    return null;
  }

  try {
    const value =
      JSON.parse(text);

    if (
      value &&
      typeof value ===
        "object"
    ) {
      return value;
    }

    return {
      value,
    };
  } catch {
    return {
      text:
        text.slice(
          0,
          300
        ),
    };
  }
}

export async function runBrandStudioCheck(
  check,
  {
    tenantSlug =
      "mondescale",

    fetchImpl =
      fetch,
  } = {}
) {
  const startedAt =
    performance.now();

  try {
    const response =
      await fetchImpl(
        check.url,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",

            "x-tenant-slug":
              tenantSlug,
          },

          credentials:
            "same-origin",

          cache:
            "no-store",
        }
      );

    const text =
      await response.text();

    const durationMs =
      Math.round(
        performance.now() -
        startedAt
      );

    return {
      id:
        check.id,

      label:
        check.label,

      url:
        check.url,

      status:
        response.status,

      durationMs,

      ok:
        check
          .acceptedStatuses
          .includes(
            response.status
          ),

      body:
        parseBodyPreview(
          text
        ),
    };
  } catch (error) {
    return {
      id:
        check.id,

      label:
        check.label,

      url:
        check.url,

      status:
        0,

      durationMs:
        Math.round(
          performance.now() -
          startedAt
        ),

      ok:
        false,

      error:
        error?.message ||
        "Connexion impossible",
    };
  }
}

export async function runBrandStudioDiagnostic({
  tenantSlug =
    "mondescale",

  fetchImpl =
    fetch,
} = {}) {
  const results = [];

  for (
    const check
    of CHECKS
  ) {
    results.push(
      await runBrandStudioCheck(
        check,
        {
          tenantSlug,
          fetchImpl,
        }
      )
    );
  }

  const passed =
    results.filter(
      (result) =>
        result.ok
    ).length;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    passed,

    failed:
      results.length -
      passed,

    total:
      results.length,

    success:
      passed ===
      results.length,

    results,
  };
}

function StatusBadge({
  result,
}) {
  return (
    <span
      className={
        result.ok
          ? "brand-studio-diagnostic-status-ok"
          : "brand-studio-diagnostic-status-error"
      }
    >
      {result.ok
        ? "Opérationnel"
        : "Échec"}
    </span>
  );
}

export function BrandStudioDiagnostic({
  tenantSlug =
    "mondescale",
}) {
  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const summary =
    useMemo(
      () => {
        if (!report) {
          return null;
        }

        return `${report.passed}/${report.total} contrôles validés`;
      },
      [
        report,
      ]
    );

  async function run() {
    setRunning(true);
    setError("");

    try {
      const result =
        await runBrandStudioDiagnostic({
          tenantSlug,
        });

      setReport(
        result
      );
    } catch (diagnosticError) {
      setError(
        diagnosticError
          ?.message ||
        "Le diagnostic n’a pas pu être exécuté."
      );
    } finally {
      setRunning(false);
    }
  }

  function exportReport() {
    if (!report) {
      return;
    }

    const blob =
      new Blob(
        [
          JSON.stringify(
            report,
            null,
            2
          ),
        ],
        {
          type:
            "application/json",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      `brand-studio-diagnostic-${new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        )}.json`;

    link.click();

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <section className="brand-studio-diagnostic">
      <header className="brand-studio-diagnostic-header">
        <div>
          <h2>
            Diagnostic de fonctionnement
          </h2>

          <p>
            Ces contrôles utilisent votre session actuelle.
            Ils ne modifient aucune donnée.
          </p>
        </div>

        <div className="brand-studio-diagnostic-actions">
          <button
            type="button"
            onClick={run}
            disabled={
              running
            }
          >
            {running
              ? "Diagnostic en cours…"
              : "Lancer le diagnostic"}
          </button>

          {report ? (
            <button
              type="button"
              onClick={
                exportReport
              }
            >
              Exporter le rapport
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p role="alert">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          <div
            className={
              report.success
                ? "brand-studio-diagnostic-summary-ok"
                : "brand-studio-diagnostic-summary-error"
            }
            aria-live="polite"
          >
            <strong>
              {summary}
            </strong>

            <span>
              {report.success
                ? "Le Brand Studio est opérationnel."
                : "Certains services nécessitent une correction."}
            </span>
          </div>

          <div className="brand-studio-diagnostic-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    Contrôle
                  </th>

                  <th>
                    État
                  </th>

                  <th>
                    HTTP
                  </th>

                  <th>
                    Durée
                  </th>
                </tr>
              </thead>

              <tbody>
                {report.results.map(
                  (
                    result
                  ) => (
                    <tr
                      key={
                        result.id
                      }
                    >
                      <td>
                        <strong>
                          {result.label}
                        </strong>

                        <small>
                          {result.url}
                        </small>
                      </td>

                      <td>
                        <StatusBadge
                          result={
                            result
                          }
                        />
                      </td>

                      <td>
                        {result.status ||
                          "—"}
                      </td>

                      <td>
                        {result.durationMs}
                        {" ms"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {!report.success ? (
            <details>
              <summary>
                Afficher les détails techniques
              </summary>

              <pre>
                {JSON.stringify(
                  report.results.filter(
                    (
                      result
                    ) =>
                      !result.ok
                  ),
                  null,
                  2
                )}
              </pre>
            </details>
          ) : null}
        </>
      ) : (
        <p>
          Lancez le diagnostic après vous être connecté à
          l’application.
        </p>
      )}
    </section>
  );
}

export {
  CHECKS as BRAND_STUDIO_RUNTIME_CHECKS,
};
