import {
  BrandStudioApiError,
} from "./errors.js";

export function buildTenantHeaders({
  tenantId,
  tenantSlug,
  headers = {},
} = {}) {
  const result = {
    Accept:
      "application/json",

    ...headers,
  };

  if (tenantId) {
    result["x-tenant-id"] =
      String(tenantId);
  } else if (tenantSlug) {
    result["x-tenant-slug"] =
      String(tenantSlug);
  }

  return result;
}

export async function parseApiResponse(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let body = null;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    body =
      await response.json();
  } else {
    const text =
      await response.text();

    body =
      text
        ? {
            message:
              text,
          }
        : {};
  }

  if (!response.ok) {
    throw new BrandStudioApiError({
      message:
        body?.message ||
        `Erreur HTTP ${response.status}`,

      code:
        body?.error ||
        body?.code ||
        "BRAND_STUDIO_HTTP_ERROR",

      status:
        response.status,

      details:
        body?.details ||
        {},
    });
  }

  return body;
}

export async function brandStudioFetch(
  url,
  {
    tenantId,
    tenantSlug,
    headers,
    ...options
  } = {}
) {
  const response =
    await fetch(
      url,
      {
        ...options,

        headers:
          buildTenantHeaders({
            tenantId,
            tenantSlug,
            headers,
          }),
      }
    );

  return parseApiResponse(
    response
  );
}
