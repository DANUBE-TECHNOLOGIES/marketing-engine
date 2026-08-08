"use strict";

const {
  sitePublicationError,
} =
  require(
    "./errors"
  );

function forwardedHeaders(
  source = {}
) {
  const headers = {
    Accept:
      "application/json",

    "Content-Type":
      "application/json",

    "x-tenant-slug":
      source[
        "x-tenant-slug"
      ] ||
      "mondescale",
  };

  for (
    const name
    of [
      "authorization",
      "cookie",
      "x-tenant-id",
      "x-request-id",
      "x-user-id",
      "x-user-name",
    ]
  ) {
    if (source[name]) {
      headers[name] =
        source[name];
    }
  }

  return headers;
}

class SiteReadinessClient {
  constructor({
    frontendOrigin,
  }) {
    this.frontendOrigin =
      String(
        frontendOrigin ||
        "http://frontend:3000"
      ).replace(
        /\/+$/,
        ""
      );
  }

  async check({
    agencyId,
    siteSlug,
    headers,
  }) {
    const search =
      new URLSearchParams({
        agencyId:
          String(
            agencyId
          ),

        siteSlug:
          String(
            siteSlug
          ),
      });

    let response;

    try {
      response =
        await fetch(
          `${this.frontendOrigin}/api/brand-studio/readiness?${search.toString()}`,
          {
            method:
              "GET",

            headers:
              forwardedHeaders(
                headers
              ),

            cache:
              "no-store",

            signal:
              AbortSignal.timeout(
                30000
              ),
          }
        );
    } catch (error) {
      throw sitePublicationError(
        "READINESS_SERVICE_UNAVAILABLE",
        "Le service de préparation du mini-site est indisponible.",
        502,
        {
          cause:
            error.message,
        }
      );
    }

    const text =
      await response.text();

    let payload = null;

    try {
      payload =
        text
          ? JSON.parse(
              text
            )
          : null;
    } catch {
      payload = null;
    }

    if (
      response.status ===
        401 ||
      response.status ===
        403
    ) {
      throw sitePublicationError(
        "READINESS_AUTHENTICATION_REQUIRED",
        "La vérification Readiness nécessite une session autorisée.",
        response.status,
        {
          status:
            response.status,
        }
      );
    }

    if (!response.ok) {
      throw sitePublicationError(
        "READINESS_CHECK_FAILED",
        payload?.message ||
          "La vérification Readiness a échoué.",
        response.status >= 400
          ? response.status
          : 502,
        {
          status:
            response.status,

          payload,
        }
      );
    }

    return payload;
  }

  assertReady(
    readiness
  ) {
    const score =
      Number(
        readiness?.score ||
        0
      );

    const missing =
      Number(
        readiness?.summary
          ?.missing ||
        0
      );

    if (
      score !== 100 ||
      missing !== 0
    ) {
      throw sitePublicationError(
        "SITE_NOT_READY",
        "Le mini-site ne peut pas être publié tant que tous les critères obligatoires ne sont pas validés.",
        409,
        {
          score,
          missing,

          status:
            readiness?.status ||
            null,

          failedChecks:
            (
              readiness?.checks ||
              []
            )
              .filter(
                (check) =>
                  check.required &&
                  !check.ready
              )
              .map(
                (check) => ({
                  id:
                    check.id,

                  label:
                    check.label,

                  category:
                    check.category,

                  action:
                    check.action,
                })
              ),
        }
      );
    }

    return true;
  }
}

module.exports = {
  SiteReadinessClient,
  forwardedHeaders,
};
