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
            500
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

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

async function fetchBrandReadiness({
  agencyId,
  siteSlug,
}) {
  const search =
    new URLSearchParams({
      agencyId:
        String(
          agencyId
        ),
    });

  if (siteSlug) {
    search.set(
      "siteSlug",
      siteSlug
    );
  }

  const response =
    await fetch(
      `/api/brand-studio/readiness?${search.toString()}`,
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

function groupReadinessChecks(
  checks
) {
  const groups =
    new Map();

  for (
    const check
    of checks || []
  ) {
    const category =
      check.category ||
      "Autres";

    if (
      !groups.has(
        category
      )
    ) {
      groups.set(
        category,
        []
      );
    }

    groups
      .get(category)
      .push(check);
  }

  return [
    ...groups.entries(),
  ].map(
    (
      [
        category,
        items,
      ]
    ) => ({
      category,
      items,

      completed:
        items.filter(
          (item) =>
            item.ready
        ).length,

      count:
        items.length,
    })
  );
}

export {
  fetchBrandReadiness,
  groupReadinessChecks,
};
