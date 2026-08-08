"use strict";

const {
  sitePublicationError,
} =
  require(
    "./errors"
  );

const {
  forwardedHeaders,
} =
  require(
    "./readiness-client"
  );

class PagePublicationClient {
  constructor({
    backendOrigin,
  }) {
    this.backendOrigin =
      String(
        backendOrigin ||
        "http://127.0.0.1:4000"
      ).replace(
        /\/+$/,
        ""
      );
  }

  async action({
    pageId,
    action,
    headers,
    body = {},
  }) {
    const allowed =
      new Set([
        "publish",
        "unpublish",
        "review",
      ]);

    if (
      !allowed.has(
        action
      )
    ) {
      throw sitePublicationError(
        "INVALID_PAGE_PUBLICATION_ACTION",
        "L’action de publication demandée est invalide.",
        500,
        {
          action,
        }
      );
    }

    const url =
      `${this.backendOrigin}` +
      `/publication/pages/` +
      encodeURIComponent(
        String(pageId)
      ) +
      `/${action}`;

    let response;

    try {
      response =
        await fetch(
          url,
          {
            method:
              "POST",

            headers:
              forwardedHeaders(
                headers
              ),

            body:
              JSON.stringify(
                body
              ),

            signal:
              AbortSignal.timeout(
                30000
              ),
          }
        );
    } catch (error) {
      throw sitePublicationError(
        "PAGE_PUBLICATION_ENGINE_UNAVAILABLE",
        "Le moteur de publication des pages est indisponible.",
        502,
        {
          pageId,
          action,

          cause:
            error.message,
        }
      );
    }

    const text =
      await response.text();

    let payload = null;

    if (text) {
      try {
        payload =
          JSON.parse(
            text
          );
      } catch {
        payload = {
          raw:
            text.slice(
              0,
              1000
            ),
        };
      }
    }

    if (
      response.status ===
        401 ||
      response.status ===
        403
    ) {
      throw sitePublicationError(
        "PAGE_PUBLICATION_AUTHENTICATION_REQUIRED",
        "Le moteur de publication a refusé l’autorisation.",
        response.status,
        {
          pageId,
          action,
        }
      );
    }

    if (!response.ok) {
      throw sitePublicationError(
        "PAGE_PUBLICATION_FAILED",
        payload?.message ||
          `La page ${pageId} n’a pas pu être ${action === "publish" ? "publiée" : "dépubliée"}.`,
        response.status >= 400
          ? response.status
          : 502,
        {
          pageId,
          action,

          status:
            response.status,

          payload,
        }
      );
    }

    return {
      pageId,
      action,

      status:
        response.status,

      payload,
    };
  }

  publish(
    options
  ) {
    return this.action({
      ...options,

      action:
        "publish",
    });
  }

  unpublish(
    options
  ) {
    return this.action({
      ...options,

      action:
        "unpublish",
    });
  }
}

module.exports = {
  PagePublicationClient,
};
