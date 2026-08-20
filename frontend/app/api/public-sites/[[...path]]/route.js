import {
  NextResponse,
} from "next/server";

const BACKEND_URL =
  String(
    process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
  ).replace(
    /\/+$/,
    ""
  );

function normalizePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function normalizeParts(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizePart).filter(Boolean);
}

function resolveRequestedPath(rawParts) {
  const parts = [...rawParts];
  while (parts.length && ["site", "sites"].includes(parts[0])) parts.shift();
  const siteSlug = parts.shift() || null;
  while (parts.length && ["page", "pages"].includes(parts[0])) parts.shift();
  const pageSlug = parts.shift() || null;
  return { siteSlug, pageSlug };
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

async function fetchJson({ url, headers }) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let body;
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

function isHomeSlug(value) {
  return ["", "accueil", "home", "index"].includes(normalizePart(value));
}

function normalizeBlock(block) {
  const type = block?.blockType || block?.type || null;
  return {
    ...block,
    type,
    blockType: type,
    content:
      block?.content && typeof block.content === "object"
        ? { ...block.content }
        : {},
    settings:
      block?.settings && typeof block.settings === "object"
        ? { ...block.settings }
        : {},
  };
}

function normalizeCanonicalPage(page) {
  if (!page || typeof page !== "object") return null;
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return {
    ...page,
    slug: normalizePart(page.slug),
    sections,
    contentBlocks: sections,
  };
}

function legalHtmlForSlug({ pageSlug, legalPages }) {
  const slug = normalizePart(pageSlug);
  if (slug === "mentions-legales") return legalPages?.legalNotice || null;
  if (slug === "confidentialite") return legalPages?.privacyPolicy || null;
  if (["cookies", "politique-de-cookies"].includes(slug)) {
    return legalPages?.cookiePolicy || null;
  }
  if (["cgv", "conditions-generales", "conditions-generales-de-vente"].includes(slug)) {
    return legalPages?.terms || null;
  }
  return null;
}

function enrichHeroBlock({ block, heroAsset }) {
  const normalized = normalizeBlock(block);
  if (normalized.type !== "hero" || !heroAsset?.publicUrl) return normalized;
  const content = { ...normalized.content };
  if (!content.imageUrl) content.imageUrl = heroAsset.publicUrl;
  if (!content.imageAlt) {
    content.imageAlt = heroAsset.altText || heroAsset.title || "";
  }
  return { ...normalized, content };
}

function enrichLegalPage({ page, html }) {
  if (!html) return page;
  const existingBlocks = Array.isArray(page.blocks) ? page.blocks.map(normalizeBlock) : [];
  const breadcrumbs = existingBlocks.filter((block) => block.type === "breadcrumbs");
  const legalBlock = {
    id: `legal-profile-${page.slug}`,
    type: "rich_text",
    blockType: "rich_text",
    status: "published",
    displayOrder: breadcrumbs.length,
    content: { title: page.title || "", html, alignment: "left" },
    settings: { source: "legal-profile", readOnly: false },
    seo: {},
    visibleDesktop: true,
    visibleMobile: true,
  };
  const blocks = [...breadcrumbs, legalBlock];
  return {
    ...page,
    blocks,
    sections: blocks,
    contentBlocks: blocks,
    legalProfileContent: html,
    legalProfileApplied: true,
  };
}

function enrichPage({ page, runtime }) {
  if (!page) return null;
  const heroAsset = runtime?.brand?.assets?.heroDefault || null;
  const legalPages = runtime?.legal?.pages || {};
  const blocks = Array.isArray(page.blocks)
    ? page.blocks.map((block) => enrichHeroBlock({ block, heroAsset }))
    : [];
  const canonicalSections = Array.isArray(page.sections) && page.sections.length
    ? page.sections
    : null;
  let enriched = {
    ...page,
    blocks,
    sections: canonicalSections || blocks,
    contentBlocks: canonicalSections || blocks,
  };
  const legalHtml = legalHtmlForSlug({ pageSlug: page.slug, legalPages });
  if (legalHtml) enriched = enrichLegalPage({ page: enriched, html: legalHtml });
  return enriched;
}

function findRequestedPage({ pages, homePage, pageSlug }) {
  if (!pageSlug || isHomeSlug(pageSlug)) {
    return homePage || pages.find((page) => isHomeSlug(page.slug)) || pages[0] || null;
  }
  return pages.find((page) => normalizePart(page.slug) === normalizePart(pageSlug)) || null;
}

function buildNavigation({ pages, site, homePage }) {
  return pages.map((page) => {
    const home = page.id === homePage?.id || isHomeSlug(page.slug);
    const path = home ? `/sites/${site.slug}` : `/sites/${site.slug}/${page.slug}`;
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

function normalizeContract({
  payload,
  brandLegalPayload,
  canonicalPagePayload,
  siteSlug,
  pageSlug,
}) {
  const source = payload?.data && typeof payload.data === "object"
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
  const legal = runtime.legal || { values: {}, pages: {} };
  const metadata = runtime.metadata || {};
  const agency = source.agency || rawSite.agency || runtime.agency || null;
  const rawPages = Array.isArray(source.pages)
    ? source.pages
    : Array.isArray(rawSite.pages)
      ? rawSite.pages
      : [];
  const pages = rawPages.map((page) =>
    enrichPage({ page: normalizeBlockPage(page), runtime })
  );
  const rawHome = source.homePage || source.home ||
    pages.find((page) => isHomeSlug(page.slug)) || pages[0] || null;
  const homePage = rawHome
    ? pages.find((page) => page.id === rawHome.id || normalizePart(page.slug) === normalizePart(rawHome.slug)) ||
      enrichPage({ page: normalizeBlockPage(rawHome), runtime })
    : null;

  const legacySelectedPage = findRequestedPage({ pages, homePage, pageSlug });
  const canonicalRaw = canonicalPagePayload?.page || canonicalPagePayload || null;
  const canonicalPage = canonicalRaw && typeof canonicalRaw === "object" && !canonicalRaw.error
    ? enrichPage({ page: normalizeCanonicalPage(canonicalRaw), runtime })
    : null;
  const canonicalMatchesRequest = canonicalPage && (
    (!pageSlug && isHomeSlug(canonicalPage.slug)) ||
    (isHomeSlug(pageSlug) && isHomeSlug(canonicalPage.slug)) ||
    normalizePart(canonicalPage.slug) === normalizePart(pageSlug)
  );
  const selectedPage = canonicalMatchesRequest ? canonicalPage : legacySelectedPage;

  if (pageSlug && !isHomeSlug(pageSlug) && !selectedPage) {
    return {
      error: "PUBLIC_SITE_PAGE_NOT_FOUND",
      message: `La page ${pageSlug} est introuvable.`,
      details: { siteSlug, pageSlug, availablePages: pages.map((page) => page.slug) },
    };
  }

  const effectivePages = selectedPage
    ? pages.map((page) =>
        normalizePart(page.slug) === normalizePart(selectedPage.slug)
          ? selectedPage
          : page
      )
    : pages;
  if (selectedPage && !effectivePages.some((page) => page.id === selectedPage.id)) {
    effectivePages.push(selectedPage);
  }

  const site = {
    ...rawSite,
    slug: rawSite.slug || siteSlug,
    agency,
    pages: effectivePages,
    homePage,
    brand,
    branding: brand,
    brandProfile: brand,
    legal,
    legalProfile: legal,
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

  const navigation = Array.isArray(source.navigation)
    ? source.navigation
    : buildNavigation({ pages: effectivePages, site, homePage });
  const page = selectedPage || homePage;
  const pageMetadata = {
    title: page?.seoTitle || page?.title || metadata.title || site.name || agency?.name || "Mondescale Voyages",
    description: page?.metaDescription || metadata.description || null,
    icons: metadata.icons || (brand.faviconUrl ? { icon: brand.faviconUrl } : null),
    openGraph: {
      ...(metadata.openGraph || {}),
      title: page?.seoTitle || page?.title || metadata.openGraph?.title || metadata.title || site.name,
      description: page?.metaDescription || metadata.openGraph?.description || metadata.description || null,
      images: metadata.openGraph?.images?.length
        ? metadata.openGraph.images
        : brand.openGraphUrl
          ? [{
              url: brand.openGraphUrl,
              width: brand.openGraph?.width || undefined,
              height: brand.openGraph?.height || undefined,
              alt: brand.openGraph?.altText || page?.title || site.name || undefined,
            }]
          : [],
    },
  };

  return {
    ...payload,
    version: "1.3",
    site,
    website: site,
    miniSite: site,
    agency,
    pages: effectivePages,
    navigation,
    homePage,
    home: homePage,
    page,
    currentPage: page,
    requestedPage: page,
    blocks: page?.blocks || [],
    sections: page?.sections || page?.blocks || [],
    brand,
    branding: brand,
    brandProfile: brand,
    legal,
    legalProfile: legal,
    metadata: pageMetadata,
    seo: pageMetadata,
    runtime,
    data: {
      ...(payload.data || {}),
      site,
      website: site,
      miniSite: site,
      agency,
      pages: effectivePages,
      navigation,
      homePage,
      home: homePage,
      page,
      currentPage: page,
      requestedPage: page,
      blocks: page?.blocks || [],
      sections: page?.sections || page?.blocks || [],
      brand,
      branding: brand,
      brandProfile: brand,
      legal,
      legalProfile: legal,
      metadata: pageMetadata,
      seo: pageMetadata,
      runtime,
    },
  };
}

function normalizeBlockPage(page) {
  if (!page || typeof page !== "object") return null;
  const blocks = Array.isArray(page.blocks) ? page.blocks.map(normalizeBlock) : [];
  return {
    ...page,
    slug: normalizePart(page.slug),
    blocks,
    sections: blocks,
    contentBlocks: blocks,
  };
}

async function handler(request, context) {
  const parameters = await context.params;
  const { siteSlug, pageSlug } = resolveRequestedPath(normalizeParts(parameters.path));
  if (!siteSlug) {
    return NextResponse.json(
      { error: "PUBLIC_SITE_SLUG_REQUIRED", message: "Le slug du mini-site est obligatoire." },
      { status: 400 }
    );
  }

  const headers = forwardedHeaders(request);
  const canonicalPageSlug = !pageSlug || isHomeSlug(pageSlug) ? "home" : pageSlug;
  let siteResult;
  let brandLegalResult;
  let canonicalPageResult;

  try {
    [siteResult, brandLegalResult, canonicalPageResult] = await Promise.all([
      fetchJson({
        url: `${BACKEND_URL}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}`,
        headers,
      }),
      fetchJson({
        url: `${BACKEND_URL}/api/public-brand-legal/sites/${encodeURIComponent(siteSlug)}`,
        headers,
      }),
      fetchJson({
        url: `${BACKEND_URL}/public/agency-sites/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(canonicalPageSlug)}`,
        headers,
      }),
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        error: "PUBLIC_SITE_BACKEND_UNAVAILABLE",
        message: "Les services publics du mini-site sont indisponibles.",
        details: { cause: error?.message || "Connexion impossible" },
      },
      { status: 502 }
    );
  }

  if (!siteResult.response.ok) {
    return NextResponse.json(siteResult.body, {
      status: siteResult.response.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const contract = normalizeContract({
    payload: siteResult.body,
    brandLegalPayload: brandLegalResult.response.ok ? brandLegalResult.body : null,
    canonicalPagePayload: canonicalPageResult.response.ok ? canonicalPageResult.body : null,
    siteSlug,
    pageSlug,
  });

  if (contract.error === "PUBLIC_SITE_PAGE_NOT_FOUND") {
    return NextResponse.json(contract, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (contract.error) return NextResponse.json(contract, { status: 502 });

  return NextResponse.json(contract, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "x-public-site-contract-version": "1.3",
      "x-public-site-brand-runtime": brandLegalResult.response.ok ? "resolved" : "unavailable",
      "x-public-site-canonical-page": canonicalPageResult.response.ok ? "resolved" : "fallback",
      "x-public-site-page-slug": pageSlug || contract.page?.slug || "",
    },
  });
}

export const dynamic = "force-dynamic";
export const GET = handler;
export const HEAD = handler;
