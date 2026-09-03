import {
  brandStudioFetch,
} from "./http.js";

function profileUrl({
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

  return `${baseUrl}/api/brand-profile${
    query
      ? `?${query}`
      : ""
  }`;
}

export async function fetchBrandProfile({
  tenantId,
  tenantSlug,
  agencyId,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    profileUrl({
      agencyId,
      baseUrl,
    }),
    {
      tenantId,
      tenantSlug,
    }
  );
}

export async function saveBrandProfile({
  tenantId,
  tenantSlug,
  agencyId,
  profile,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    profileUrl({
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

export async function deleteBrandProfileOverride({
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
    `${baseUrl}/api/brand-profile/override?${params}`,
    {
      tenantId,
      tenantSlug,

      method:
        "DELETE",
    }
  );
}
