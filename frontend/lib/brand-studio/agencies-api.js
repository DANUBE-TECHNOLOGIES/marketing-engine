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

function normalizeAgencyOption(
  agency
) {
  const id =
    Number(
      agency?.id ||
      agency?.agencyId
    );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  const name =
    String(
      agency.name ||
      agency.label ||
      `Agence #${id}`
    );

  const city =
    String(
      agency.city ||
      ""
    );

  return {
    id,

    name,

    city,

    postalCode:
      String(
        agency.postalCode ||
        ""
      ),

    label:
      agency.label ||
      [
        name,
        city || null,
      ]
        .filter(Boolean)
        .join(" — "),

    siteId:
      agency.siteId ||
      null,

    siteSlug:
      agency.siteSlug ||
      null,

    siteStatus:
      agency.siteStatus ||
      null,

    published:
      Boolean(
        agency.published
      ),
  };
}

async function fetchBrandStudioAgencies() {
  const response =
    await fetch(
      "/api/brand-studio/agencies",
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

  const payload =
    await parseJsonResponse(
      response
    );

  const source =
    Array.isArray(
      payload
    )
      ? payload
      : payload.agencies ||
        payload.data?.agencies ||
        [];

  return source
    .map(
      normalizeAgencyOption
    )
    .filter(Boolean);
}

export {
  fetchBrandStudioAgencies,
  normalizeAgencyOption,
};
