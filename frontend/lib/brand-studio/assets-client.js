import {
  brandStudioFetch,
} from "./http.js";

export function buildAssetQuery({
  agencyId,
  kind,
  limit,
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

  if (kind) {
    params.set(
      "kind",
      String(kind)
    );
  }

  if (limit) {
    params.set(
      "limit",
      String(limit)
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
}

export async function fetchBrandAssets({
  tenantId,
  tenantSlug,
  agencyId,
  kind,
  limit = 100,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    `${baseUrl}/api/brand-assets${buildAssetQuery({
      agencyId,
      kind,
      limit,
    })}`,
    {
      tenantId,
      tenantSlug,
    }
  );
}

export async function uploadBrandAsset({
  tenantId,
  tenantSlug,
  agencyId,
  kind,
  file,
  altText,
  title,
  description,
  baseUrl = "",
  signal,
} = {}) {
  if (
    !(file instanceof Blob)
  ) {
    throw new TypeError(
      "Le fichier à déposer doit être un objet Blob ou File."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    file,
    file.name ||
    "asset"
  );

  formData.append(
    "kind",
    kind
  );

  if (
    agencyId !== undefined &&
    agencyId !== null &&
    agencyId !== ""
  ) {
    formData.append(
      "agencyId",
      String(agencyId)
    );
  }

  if (altText) {
    formData.append(
      "altText",
      altText
    );
  }

  if (title) {
    formData.append(
      "title",
      title
    );
  }

  if (description) {
    formData.append(
      "description",
      description
    );
  }

  return brandStudioFetch(
    `${baseUrl}/api/brand-assets/upload`,
    {
      tenantId,
      tenantSlug,

      method:
        "POST",

      body:
        formData,

      signal,
    }
  );
}

export async function deleteBrandAsset({
  tenantId,
  tenantSlug,
  assetId,
  baseUrl = "",
} = {}) {
  return brandStudioFetch(
    `${baseUrl}/api/brand-assets/${encodeURIComponent(
      assetId
    )}`,
    {
      tenantId,
      tenantSlug,

      method:
        "DELETE",
    }
  );
}
