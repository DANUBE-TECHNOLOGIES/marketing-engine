async function parseJsonResponse(
  response
) {
  const text =
    await response.text();

  let payload = null;

  if (text) {
    try {
      payload =
        JSON.parse(text);
    } catch {
      payload = {
        error:
          "INVALID_JSON",

        message:
          text.slice(
            0,
            1000
          ),
      };
    }
  }

  if (!response.ok) {
    const error =
      new Error(
        payload?.message ||
        payload?.error ||
        `Erreur HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.code =
      payload?.error ||
      "SITE_PUBLICATION_REQUEST_FAILED";

    error.details =
      payload?.details ||
      {};

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

function normalizeSiteId(
  value
) {
  const normalized =
    String(
      value || ""
    ).trim();

  if (!normalized) {
    throw new Error(
      "L’identifiant du mini-site est absent."
    );
  }

  return normalized;
}

async function sitePublicationRequest({
  siteId,
  suffix,
  method = "GET",
  body,
}) {
  const normalizedSiteId =
    normalizeSiteId(
      siteId
    );

  const response =
    await fetch(
      `/api/site-publication/sites/${encodeURIComponent(normalizedSiteId)}/${suffix}`,
      {
        method,

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          "x-tenant-slug":
            "mondescale",
        },

        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                body
              ),

        cache:
          "no-store",
      }
    );

  return parseJsonResponse(
    response
  );
}

function fetchSitePublicationPlan(
  siteId
) {
  return sitePublicationRequest({
    siteId,

    suffix:
      "plan",
  });
}

function fetchSitePublicationStatus(
  siteId
) {
  return sitePublicationRequest({
    siteId,
    suffix:
      "status",
  });
}

async function fetchSitePublicationHistory(
  siteId,
  {
    limit = 20,
  } = {}
) {
  const normalizedSiteId =
    normalizeSiteId(
      siteId
    );

  const search =
    new URLSearchParams({
      limit:
        String(limit),
    });

  const response =
    await fetch(
      `/api/site-publication/sites/${encodeURIComponent(normalizedSiteId)}/history?${search.toString()}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",

          "x-tenant-slug":
            "mondescale",
        },

        cache:
          "no-store",
      }
    );

  return parseJsonResponse(
    response
  );
}

function publishSite(
  siteId,
  planToken
) {
  const normalizedPlanToken =
    String(
      planToken ||
      ""
    ).trim();

  if (!normalizedPlanToken) {
    const error =
      new Error(
        "Le plan de publication doit être actualisé."
      );

    error.code =
      "PUBLICATION_PLAN_TOKEN_REQUIRED";

    throw error;
  }

  return sitePublicationRequest({
    siteId,

    suffix:
      "publish",

    method:
      "POST",

    body: {
      force:
        false,

      planToken:
        normalizedPlanToken,
    },
  });
}

function unpublishSite(
  siteId
) {
  return sitePublicationRequest({
    siteId,
    suffix:
      "unpublish",

    method:
      "POST",

    body: {},
  });
}

function publicationPercentage(
  status
) {
  const total =
    Number(
      status?.pages?.total ||
      0
    );

  const published =
    Number(
      status?.pages?.published ||
      0
    );

  if (!total) {
    return 0;
  }

  return Math.round(
    (
      published /
      total
    ) *
    100
  );
}

function normalizeHistoryItems(
  payload
) {
  const source =
    Array.isArray(
      payload
    )
      ? payload
      : payload?.items ||
        [];

  return source.map(
    (item) => ({
      id:
        item.id,

      operation:
        item.operation,

      outcome:
        item.outcome,

      siteSlug:
        item.siteSlug ||
        null,

      actor:
        item.actor ||
        {},

      startedAt:
        item.startedAt ||
        null,

      completedAt:
        item.completedAt ||
        null,

      durationMs:
        Number(
          item.durationMs ||
          0
        ),

      pages:
        item.pages ||
        {},

      readiness:
        item.readiness ||
        null,

      error:
        item.error ||
        null,

      rollback:
        item.rollback ||
        [],
    })
  );
}

export {

  fetchSitePublicationPlan,  fetchSitePublicationHistory,
  fetchSitePublicationStatus,
  normalizeHistoryItems,
  normalizeSiteId,
  publicationPercentage,
  publishSite,
  unpublishSite,
};
