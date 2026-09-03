import { cache } from "react";

function normalizeSiteSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function getRuntimeOrigin() {
  return String(
    process.env.BACKEND_INTERNAL_URL ||
    process.env.INTERNAL_FRONTEND_ORIGIN ||
    process.env.INTERNAL_FRONTEND_URL ||
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

const PUBLIC_RUNTIME_REVALIDATE_SECONDS = Math.max(
  30,
  Number(process.env.PUBLIC_SITE_REVALIDATE_SECONDS || 300) || 300
);

export const fetchPublicBrandLegalRuntime = cache(async (siteSlug) => {
  const normalizedSlug = normalizeSiteSlug(siteSlug);
  if (!normalizedSlug) return null;

  const url = `${getRuntimeOrigin()}/api/public-brand-legal/sites/${encodeURIComponent(normalizedSlug)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-tenant-slug": getTenantSlug(),
      },
      next: {
        revalidate: PUBLIC_RUNTIME_REVALIDATE_SECONDS,
      },
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      console.error("[PUBLIC_BRAND_LEGAL_RUNTIME]", {
        siteSlug: normalizedSlug,
        status: response.status,
        origin: getRuntimeOrigin(),
      });
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[PUBLIC_BRAND_LEGAL_RUNTIME]", {
      siteSlug: normalizedSlug,
      message: error?.message || "Runtime inaccessible",
      origin: getRuntimeOrigin(),
    });
    return null;
  }
});

export function runtimeCssVariables(contract) {
  const variables = contract?.runtime?.brand?.cssVariables;
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) return {};
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([key, value]) => /^--[a-zA-Z0-9_-]+$/.test(key) && value !== null && value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)])
  );
}

export function runtimeBrandAssets(contract) {
  return contract?.runtime?.brand?.assets || {};
}

export function runtimeLegalPages(contract) {
  return contract?.runtime?.legal?.pages || {};
}

export function runtimeLegalValues(contract) {
  const values = contract?.runtime?.legal?.values;
  return values && typeof values === "object" && !Array.isArray(values) ? values : {};
}

export function runtimeMetadata(contract) {
  return contract?.runtime?.metadata || {};
}

export function mergePublicMetadata(baseMetadata, contract) {
  const runtime = runtimeMetadata(contract);
  const result = { ...(baseMetadata || {}) };
  if (!result.title && runtime.title) result.title = runtime.title;
  if (!result.description && runtime.description) result.description = runtime.description;
  if (runtime.icons?.icon) result.icons = { ...(result.icons || {}), icon: runtime.icons.icon };
  if (runtime.openGraph) {
    result.openGraph = { ...(runtime.openGraph || {}), ...(result.openGraph || {}) };
    if (!result.openGraph.images?.length && runtime.openGraph.images?.length) result.openGraph.images = runtime.openGraph.images;
  }
  return result;
}

export function resolveLegalPageHtml(pageSlug, contract) {
  const normalized = String(pageSlug || "").trim().toLowerCase();
  const pages = runtimeLegalPages(contract);
  let html = null;

  if (normalized === "mentions-legales") html = pages.legalNotice || null;
  else if (normalized === "confidentialite") html = pages.privacyPolicy || null;
  else if (normalized === "cookies" || normalized === "politique-de-cookies") html = pages.cookiePolicy || null;
  else if (normalized === "cgv" || normalized === "conditions-generales") html = pages.terms || null;

  if (!html) return null;

  return {
    html,
    legalProfile: runtimeLegalValues(contract),
  };
}

export {
  PUBLIC_RUNTIME_REVALIDATE_SECONDS,
  getTenantSlug,
  getRuntimeOrigin,
};
