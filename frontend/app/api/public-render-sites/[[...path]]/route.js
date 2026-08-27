import { NextResponse } from "next/server";

const BACKEND_URL = String(
  process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
).replace(/\/+$/g, "");

const REVALIDATE_SECONDS = Math.max(
  30,
  Number(process.env.PUBLIC_SITE_REVALIDATE_SECONDS || 300) || 300
);

function normalizePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function resolvePath(value) {
  const parts = Array.isArray(value)
    ? value.map(normalizePart).filter(Boolean)
    : [];

  const siteSlug = parts.shift() || null;

  while (parts.length && ["page", "pages"].includes(parts[0])) {
    parts.shift();
  }

  const pageSlug = parts.shift() || null;

  return { siteSlug, pageSlug };
}

function isHomeSlug(value) {
  return ["", "home", "accueil", "index"].includes(normalizePart(value));
}

function forwardedHeaders(request) {
  const headers = new Headers();

  for (const name of [
    "accept",
    "authorization",
    "cookie",
    "x-tenant-id",
    "x-tenant-slug",
    "x-request-id",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (!headers.has("x-tenant-id") && !headers.has("x-tenant-slug")) {
    headers.set("x-tenant-slug", "mondescale");
  }

  return headers;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = {
      error: "INVALID_JSON",
      message: "Le service a retourné une réponse JSON invalide.",
      details: { preview: text.slice(0, 500) },
    };
  }

  return { response, body };
}

function normalizeBlock(block, heroAsset) {
  const type = block?.blockType || block?.type || null;
  const content =
    block?.content && typeof block.content === "object"
      ? { ...block.content }
      : {};

  if (type === "hero" && heroAsset?.publicUrl) {
    if (!content.imageUrl) content.imageUrl = heroAsset.publicUrl;
    if (!content.imageAlt) {
      content.imageAlt = heroAsset.altText || heroAsset.title || "";
    }
  }

  return {
    ...block,
    type,
    blockType: type,
    content,
    settings:
      block?.settings && typeof block.settings === "object"
        ? { ...block.settings }
        : {},
  };
}

function normalizePage(page, heroAsset) {
  if (!page || typeof page !== "object") return null;

  const sourceBlocks = Array.isArray(page.blocks)
    ? page.blocks
    : Array.isArray(page.sections)
      ? page.sections
      : [];

  const blocks = sourceBlocks.map((block) => normalizeBlock(block, heroAsset));

  const {
    sections: _sections,
    contentBlocks: _contentBlocks,
    ...rest
  } = page;

  return {
    ...rest,
    blocks,
  };
}

function findRequestedPage(pages, homePage, pageSlug) {
  if (!pageSlug || isHomeSlug(pageSlug)) {
    return (
      homePage ||
      pages.find((page) => isHomeSlug(page?.slug)) ||
      pages[0] ||
      null
    );
  }

  const wanted = normalizePart(pageSlug);
  return pages.find((page) => normalizePart(page?.slug) === wanted) || null;
}

function buildNavigation(pages, site, homePage) {
  return pages.map((page) => {
    const home = page?.id === homePage?.id || isHomeSlug(page?.slug);
    const path = home
      ? `/sites/${site.slug}`
      : `/sites/${site.slug}/${page.slug}`;

    return {
      id: page.id,
      slug: page.slug,
      title: page.title || page.name || page.slug,
      path,
      href: path,
      displayOrder: page.displayOrder ?? page.order ?? 0,
      status: page.status ?? null,
    };
  });
}

function publicBrandContract(runtime) {
  const values = runtime?.brand?.values || {};
  const assets = runtime?.brand?.assets || {};
  const logo = assets.logoPrimary || assets.logoLight || assets.logoDark || null;

  return {
    ...values,
    values,
    assets,
    cssVariables: runtime?.brand?.cssVariables || {},
    cssText: runtime?.brand?.cssText || "",
    logo,
    logoUrl: logo?.publicUrl || null,
    logoPrimary: assets.logoPrimary || null,
    logoPrimaryUrl: assets.logoPrimary?.publicUrl || null,
    logoLight: assets.logoLight || null,
    logoLightUrl: assets.logoLight?.publicUrl || null,
    logoDark: assets.logoDark || null,
    logoDarkUrl: assets.logoDark?.publicUrl || null,
    favicon: assets.favicon || null,
    faviconUrl: assets.favicon?.publicUrl || null,
    heroDefault: assets.heroDefault || null,
    heroDefaultUrl: assets.heroDefault?.publicUrl || null,
    openGraph: assets.openGraph || null,
    openGraphUrl: assets.openGraph?.publicUrl || null,
  };
}

function compactContractFromSources({ payload, brandLegalPayload, siteSlug, pageSlug }) {
  const source =
    payload?.data && typeof payload.data === "object"
      ? { ...payload.data, ...payload }
      : payload;

  const rawSite = source?.site || source?.website || source?.miniSite || null;
  if (!rawSite) {
    return {
      error: "PUBLIC_SITE_CONTRACT_INVALID",
      message: "Le contrat public ne contient aucun mini-site.",
    };
  }

  const runtime = brandLegalPayload?.runtime || {};
  const brand = publicBrandContract(runtime);
  const agency = source?.agency || rawSite?.agency || runtime?.agency || null;
  const heroAsset = runtime?.brand?.assets?.heroDefault || null;

  const rawPages = Array.isArray(source?.pages)
    ? source.pages
    : Array.isArray(rawSite?.pages)
      ? rawSite.pages
      : [];

  const pages = rawPages.map((page) => normalizePage(page, heroAsset));
  const rawHome =
    source?.homePage ||
    source?.home ||
    rawPages.find((page) => isHomeSlug(page?.slug)) ||
    rawPages[0] ||
    null;

  const normalizedHome = rawHome ? normalizePage(rawHome, heroAsset) : null;
  const homePage = normalizedHome
    ? pages.find(
        (page) =>
          page?.id === normalizedHome.id ||
          normalizePart(page?.slug) === normalizePart(normalizedHome.slug)
      ) || normalizedHome
    : pages.find((page) => isHomeSlug(page?.slug)) || pages[0] || null;

  const selectedPage = findRequestedPage(pages, homePage, pageSlug);

  if (pageSlug && !isHomeSlug(pageSlug) && !selectedPage) {
    return {
      error: "PUBLIC_SITE_PAGE_NOT_FOUND",
      message: `La page ${pageSlug} est introuvable.`,
      details: {
        siteSlug,
        pageSlug,
        availablePages: pages.map((page) => page?.slug).filter(Boolean),
      },
    };
  }

  const site = {
    ...rawSite,
    slug: rawSite.slug || siteSlug,
    agency,
    brand,
    branding: brand,
    brandProfile: brand,
    legal: runtime?.legal || { values: {}, pages: {} },
    legalProfile: runtime?.legal || { values: {}, pages: {} },
    theme: {
      ...(rawSite.theme || {}),
      ...brand.values,
      cssVariables: brand.cssVariables,
      logoUrl: brand.logoUrl,
      faviconUrl: brand.faviconUrl,
      heroDefaultUrl: brand.heroDefaultUrl,
      openGraphUrl: brand.openGraphUrl,
    },
    logoUrl: brand.logoUrl,
    faviconUrl: brand.faviconUrl,
    heroDefaultUrl: brand.heroDefaultUrl,
    openGraphUrl: brand.openGraphUrl,
  };

  delete site.pages;
  delete site.homePage;

  const navigation = Array.isArray(source?.navigation)
    ? source.navigation
    : buildNavigation(pages, { ...site, slug: site.slug || siteSlug }, homePage);

  const page = selectedPage || homePage;
  const home = isHomeSlug(pageSlug) ? page : null;

  return {
    version: source?.version || "1.2",
    renderContractVersion: "1",
    site,
    agency,
    navigation,
    pages: page ? [page] : [],
    homePage: home,
    home,
    page,
    metadata: runtime?.metadata || source?.metadata || null,
  };
}

async function loadCompactContract(request, siteSlug, pageSlug) {
  const headers = forwardedHeaders(request);

  const [siteResult, brandLegalResult] = await Promise.all([
    fetchJson(
      `${BACKEND_URL}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}`,
      headers
    ),
    fetchJson(
      `${BACKEND_URL}/api/public-brand-legal/sites/${encodeURIComponent(siteSlug)}`,
      headers
    ),
  ]);

  if (!siteResult.response.ok) {
    return {
      status: siteResult.response.status,
      error: siteResult.body,
    };
  }

  const contract = compactContractFromSources({
    payload: siteResult.body,
    brandLegalPayload: brandLegalResult.response.ok ? brandLegalResult.body : null,
    siteSlug,
    pageSlug,
  });

  if (contract?.error) {
    const status = contract.error === "PUBLIC_SITE_PAGE_NOT_FOUND" ? 404 : 502;
    return { status, error: contract };
  }

  return { status: 200, contract };
}

async function handler(request, context) {
  const parameters = await context.params;
  const { siteSlug, pageSlug } = resolvePath(parameters.path);

  if (!siteSlug) {
    return NextResponse.json(
      {
        error: "PUBLIC_RENDER_SITE_SLUG_REQUIRED",
        message: "Le slug du mini-site est obligatoire.",
      },
      { status: 400 }
    );
  }

  let result;

  try {
    result = await loadCompactContract(request, siteSlug, pageSlug);
  } catch (error) {
    return NextResponse.json(
      {
        error: "PUBLIC_RENDER_UPSTREAM_UNAVAILABLE",
        message: "Le contrat public du mini-site est indisponible.",
        details: { cause: error?.message || "Connexion impossible" },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (result.status !== 200) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const contract = result.contract;

  return NextResponse.json(contract, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
      "x-public-render-contract-version": "1",
      "x-public-render-source-version": String(contract?.version || "1.2"),
      "x-public-render-source": "backend-direct",
    },
  });
}

export const dynamic = "force-dynamic";
export const GET = handler;
export const HEAD = handler;

export {
  compactContractFromSources,
  findRequestedPage,
  isHomeSlug,
  loadCompactContract,
  normalizePage,
  resolvePath,
};
