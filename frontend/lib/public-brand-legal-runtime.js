function normalizeSiteSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function getInternalOrigin() {
  return String(
    process.env.INTERNAL_FRONTEND_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

function getTenantSlug() {
  return String(
    process.env.TENANT_SLUG ||
    process.env.NEXT_PUBLIC_TENANT_SLUG ||
    "mondescale"
  ).trim();
}

export async function fetchPublicBrandLegalRuntime(
  siteSlug
) {
  const normalizedSlug =
    normalizeSiteSlug(siteSlug);

  if (!normalizedSlug) {
    return null;
  }

  const url =
    `${getInternalOrigin()}` +
    `/api/public-brand-legal/sites/` +
    encodeURIComponent(normalizedSlug);

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-tenant-slug": getTenantSlug(),
        },
        cache: "no-store",
      });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(
        "[PUBLIC_BRAND_LEGAL_RUNTIME]",
        {
          siteSlug: normalizedSlug,
          status: response.status,
        }
      );

      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(
      "[PUBLIC_BRAND_LEGAL_RUNTIME]",
      {
        siteSlug: normalizedSlug,
        message: error?.message || "Runtime inaccessible",
      }
    );

    return null;
  }
}

export function runtimeCssVariables(
  contract
) {
  const variables = contract?.runtime?.brand?.cssVariables;

  if (
    !variables ||
    typeof variables !== "object" ||
    Array.isArray(variables)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(variables)
      .filter(
        ([key, value]) =>
          /^--[a-zA-Z0-9_-]+$/.test(key) &&
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(([key, value]) => [key, String(value)])
  );
}

export function runtimeBrandAssets(
  contract
) {
  return contract?.runtime?.brand?.assets || {};
}

export function runtimeLegalPages(
  contract
) {
  return contract?.runtime?.legal?.pages || {};
}

export function runtimeMetadata(
  contract
) {
  return contract?.runtime?.metadata || {};
}

export function mergePublicMetadata(
  baseMetadata,
  contract
) {
  const runtime = runtimeMetadata(contract);

  const result = {
    ...(baseMetadata || {}),
  };

  if (!result.title && runtime.title) {
    result.title = runtime.title;
  }

  if (!result.description && runtime.description) {
    result.description = runtime.description;
  }

  if (runtime.icons?.icon) {
    result.icons = {
      ...(result.icons || {}),
      icon: runtime.icons.icon,
    };
  }

  if (runtime.openGraph) {
    result.openGraph = {
      ...(runtime.openGraph || {}),
      ...(result.openGraph || {}),
    };

    if (
      !result.openGraph.images?.length &&
      runtime.openGraph.images?.length
    ) {
      result.openGraph.images = runtime.openGraph.images;
    }
  }

  return result;
}

export function resolveLegalPageHtml(
  pageSlug,
  contract
) {
  const normalized =
    String(pageSlug || "")
      .trim()
      .toLowerCase();

  const pages = runtimeLegalPages(contract);

  if (normalized === "mentions-legales") {
    return pages.legalNotice || null;
  }

  if (normalized === "confidentialite") {
    return pages.privacyPolicy || null;
  }

  if (
    normalized === "cookies" ||
    normalized === "politique-de-cookies"
  ) {
    return pages.cookiePolicy || null;
  }

  if (
    normalized === "cgv" ||
    normalized === "conditions-generales"
  ) {
    return pages.terms || null;
  }

  return null;
}

export {
  getTenantSlug,
};
