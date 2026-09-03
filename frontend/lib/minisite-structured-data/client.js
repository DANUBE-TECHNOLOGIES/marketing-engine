import {
  isValidJsonLdGraph,
} from "./serializer.js";

function normalizeOrigin(
  value
) {
  return String(
    value || ""
  ).replace(
    /\/+$/g,
    ""
  );
}

function tenantSlug(options = {}) {
  return String(
    options.tenantSlug ||
    process.env.TENANT_SLUG ||
    process.env.NEXT_PUBLIC_TENANT_SLUG ||
    "mondescale"
  ).trim();
}

function publicHeaders(options = {}) {
  return {
    Accept: "application/json",
    "x-tenant-slug": tenantSlug(options),
  };
}

export function getBackendOrigin() {
  return normalizeOrigin(
    process.env
      .MINISITE_BACKEND_INTERNAL_URL ||
    process.env
      .BACKEND_INTERNAL_URL ||
    process.env
      .API_INTERNAL_URL ||
    process.env
      .NEXT_PUBLIC_API_URL ||
    "http://backend:4000"
  );
}

export async function fetchMiniSiteStructuredData(
  siteSlug,
  options = {}
) {
  const normalizedSlug =
    String(
      siteSlug || ""
    ).trim();

  if (!normalizedSlug) {
    return null;
  }

  const backendOrigin =
    options.backendOrigin ||
    getBackendOrigin();

  const url =
    `${normalizeOrigin(
      backendOrigin
    )}/minisite-structured-data/sites/${encodeURIComponent(
      normalizedSlug
    )}`;

  let response;

  try {
    response =
      await fetch(
        url,
        {
          method: "GET",
          headers: publicHeaders(options),
          next: {
            revalidate: 300,
          },
          signal: AbortSignal.timeout(8000),
        }
      );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    return null;
  }

  if (
    !payload.validation?.valid ||
    !isValidJsonLdGraph(payload.graph)
  ) {
    return null;
  }

  return payload;
}

export async function fetchMiniSiteSitemap(
  options = {}
) {
  const backendOrigin =
    options.backendOrigin ||
    getBackendOrigin();

  const url =
    `${normalizeOrigin(
      backendOrigin
    )}/minisite-structured-data/sitemap`;

  let response;

  try {
    response =
      await fetch(
        url,
        {
          method: "GET",
          headers: publicHeaders(options),
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }
      );
  } catch (error) {
    return {
      entries: [],
      summary: {
        entryCount: 0,
      },
      error:
        error?.name === "TimeoutError" ||
        error?.name === "AbortError"
          ? "BACKEND_TIMEOUT"
          : "BACKEND_UNREACHABLE",
    };
  }

  if (!response.ok) {
    return {
      entries: [],
      summary: {
        entryCount: 0,
      },
      error:
        `BACKEND_HTTP_${response.status}`,
    };
  }

  try {
    const payload = await response.json();

    return {
      ...payload,
      entries: Array.isArray(payload.entries)
        ? payload.entries
        : [],
      error: null,
    };
  } catch {
    return {
      entries: [],
      summary: {
        entryCount: 0,
      },
      error: "BACKEND_INVALID_JSON",
    };
  }
}

export {
  publicHeaders,
  tenantSlug,
};
