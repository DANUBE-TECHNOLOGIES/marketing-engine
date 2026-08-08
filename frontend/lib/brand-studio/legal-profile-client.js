import {
  brandStudioFetch,
} from "./http.js";

function legalProfileUrl({
  agencyId,
  baseUrl = "",
} = {}) {
  const params =
    new URLSearchParams();

  if (
    agencyId !== undefined &&
    agencyId !== null &&
    agencyId !== ""
  ) {
    params.set(
      "agencyId",
      String(agencyId)
    );
  }

  const query =
    params.toString();

  return `${baseUrl}/api/legal-profile${
    query
      ? `?${query}`
      : ""
  }`;
}

export async function fetchLegalProfile({
  tenantId,
  tenantSlug,
  agencyId,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    legalProfileUrl({
      agencyId,
      baseUrl,
    }),
    {
      tenantId,
      tenantSlug,
    }
  );
}

export async function saveLegalProfile({
  tenantId,
  tenantSlug,
  agencyId,
  profile,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    legalProfileUrl({
      agencyId,
      baseUrl,
    }),
    {
      tenantId,
      tenantSlug,

      method:
        "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          ...profile,

          agencyId:
            agencyId ??
            profile?.agencyId ??
            null,
        }),
    }
  );
}

export async function deleteLegalProfileOverride({
  tenantId,
  tenantSlug,
  agencyId,
  baseUrl = "",
} = {}) {
  const params =
    new URLSearchParams({
      agencyId:
        String(agencyId),
    });

  return brandStudioFetch(
    `${baseUrl}/api/legal-profile/override?${params}`,
    {
      tenantId,
      tenantSlug,

      method:
        "DELETE",
    }
  );
}
