const MEDIA_KINDS = Object.freeze([
  {
    value:
      "logo-primary",

    label:
      "Logo principal",

    profileField:
      "logoPrimaryId",
  },

  {
    value:
      "logo-light",

    label:
      "Logo clair",

    profileField:
      "logoLightId",
  },

  {
    value:
      "logo-dark",

    label:
      "Logo sombre",

    profileField:
      "logoDarkId",
  },

  {
    value:
      "favicon",

    label:
      "Favicon",

    profileField:
      "faviconId",
  },

  {
    value:
      "hero-default",

    label:
      "Image Hero",

    profileField:
      "heroDefaultId",
  },

  {
    value:
      "open-graph",

    label:
      "Image OpenGraph",

    profileField:
      "openGraphId",
  },
]);

function normalizeAgencyId(
  value
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      "L’identifiant agence est invalide."
    );
  }

  return parsed;
}

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

function tenantHeaders() {
  return {
    Accept:
      "application/json",

    "x-tenant-slug":
      "mondescale",
  };
}

export async function fetchBrandProfile(
  agencyId
) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const candidates = [
    `/api/brand-profile/agencies/${normalizedAgencyId}`,
    `/api/brand-profile?agencyId=${normalizedAgencyId}`,
  ];

  for (
    const candidate
    of candidates
  ) {
    const response =
      await fetch(
        candidate,
        {
          method:
            "GET",

          headers:
            tenantHeaders(),

          cache:
            "no-store",
        }
      );

    if (
      response.status ===
      404
    ) {
      continue;
    }

    return (
      await parseJsonResponse(
        response
      )
    );
  }

  return null;
}

export async function saveBrandProfile({
  agencyId,
  profile,
}) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  const candidates = [
    {
      url:
        `/api/brand-profile/agencies/${normalizedAgencyId}`,

      method:
        "PUT",
    },

    {
      url:
        "/api/brand-profile",

      method:
        "PUT",
    },

    {
      url:
        "/api/brand-profile",

      method:
        "POST",
    },
  ];

  let lastError = null;

  for (
    const candidate
    of candidates
  ) {
    const response =
      await fetch(
        candidate.url,
        {
          method:
            candidate.method,

          headers: {
            ...tenantHeaders(),

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              agencyId:
                normalizedAgencyId,

              ...profile,
            }),
        }
      );

    if (
      response.status === 404 ||
      response.status === 405
    ) {
      continue;
    }

    try {
      return await parseJsonResponse(
        response
      );
    } catch (error) {
      lastError =
        error;

      if (
        error.status === 404 ||
        error.status === 405
      ) {
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Aucun contrat d’enregistrement du profil n’est disponible."
    )
  );
}

export async function fetchBrandAssets({
  agencyId,
  kind,
} = {}) {
  const search =
    new URLSearchParams();

  if (agencyId) {
    search.set(
      "agencyId",
      String(
        normalizeAgencyId(
          agencyId
        )
      )
    );
  }

  if (kind) {
    search.set(
      "kind",
      kind
    );
  }

  const suffix =
    search.toString()
      ? `?${search.toString()}`
      : "";

  const response =
    await fetch(
      `/api/brand-assets${suffix}`,
      {
        method:
          "GET",

        headers:
          tenantHeaders(),

        cache:
          "no-store",
      }
    );

  const payload =
    await parseJsonResponse(
      response
    );

  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  return (
    payload?.assets ||
    payload?.items ||
    payload?.data ||
    []
  );
}

export async function uploadBrandAsset({
  agencyId,
  kind,
  file,
  altText,
}) {
  const normalizedAgencyId =
    normalizeAgencyId(
      agencyId
    );

  if (
    !(file instanceof File)
  ) {
    throw new Error(
      "Aucun fichier valide n’a été sélectionné."
    );
  }

  const formData =
    new FormData();

  formData.set(
    "file",
    file
  );

  formData.set(
    "agencyId",
    String(
      normalizedAgencyId
    )
  );

  formData.set(
    "kind",
    kind
  );

  if (altText) {
    formData.set(
      "altText",
      altText
    );
  }

  const candidates = [
    "/api/brand-assets/upload",
    "/api/brand-assets",
  ];

  let lastError = null;

  for (
    const url
    of candidates
  ) {
    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers:
            tenantHeaders(),

          body:
            formData,
        }
      );

    if (
      response.status === 404 ||
      response.status === 405
    ) {
      continue;
    }

    try {
      return await parseJsonResponse(
        response
      );
    } catch (error) {
      lastError =
        error;

      if (
        error.status === 404 ||
        error.status === 405
      ) {
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Aucun endpoint d’upload Brand Assets n’est disponible."
    )
  );
}

export async function deleteBrandAsset(
  assetId
) {
  const normalized =
    String(
      assetId || ""
    ).trim();

  if (!normalized) {
    throw new Error(
      "Identifiant média absent."
    );
  }

  const response =
    await fetch(
      `/api/brand-assets/${encodeURIComponent(normalized)}`,
      {
        method:
          "DELETE",

        headers:
          tenantHeaders(),
      }
    );

  if (
    response.status === 204
  ) {
    return true;
  }

  return parseJsonResponse(
    response
  );
}

export function normalizeAsset(
  value
) {
  if (!value) {
    return null;
  }

  return {
    id:
      value.id,

    kind:
      value.kind,

    publicUrl:
      value.publicUrl ||
      value.url ||
      null,

    altText:
      value.altText ||
      value.alt ||
      "",

    title:
      value.title ||
      "",

    originalName:
      value.originalName ||
      value.filename ||
      "",

    mimeType:
      value.mimeType ||
      value.contentType ||
      "",

    width:
      value.width ||
      null,

    height:
      value.height ||
      null,
  };
}

export {
  MEDIA_KINDS,
  normalizeAgencyId,
};
