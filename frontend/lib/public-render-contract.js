const BACKEND_URL = String(
  process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
).replace(/\/+$/g, "");

function normalizePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function isHomeSlug(value) {
  return ["", "home", "accueil", "index"].includes(normalizePart(value));
}

function buildPublicHeaders(input) {
  const headers = new Headers();
  const source = input instanceof Headers ? input : input?.headers;

  if (source && typeof source.get === "function") {
    for (const name of [
      "accept",
      "authorization",
      "cookie",
      "x-tenant-id",
      "x-tenant-slug",
      "x-request-id",
    ]) {
      const value = source.get(name);
      if (value) headers.set(name, value);
    }
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

function legalHtmlForSlug(pageSlug, legalPages = {}) {
  const slug = normalizePart(pageSlug);

  if (["mentions-legales", "mentions_legales"].includes(slug)) {
    return legalPages.legalNotice || null;
  }
  if (["confidentialite", "politique-de-confidentialite", "privacy"].includes(slug)) {
    return legalPages.privacyPolicy || null;
  }
  if (["cookies", "politique-de-cookies"].includes(slug)) {
    return legalPages.cookiePolicy || null;
  }
  if (["cgv", "conditions-generales", "conditions-generales-de-vente"].includes(slug)) {
    return legalPages.terms || null;
  }
  return null;
}

function normalizeBlock(block, heroAsset) {
  const hasJsonContent = Boolean(
    block?.jsonContent && typeof block.jsonContent === "object"
  );
  const sourceContent = hasJsonContent
    ? block.jsonContent
    : block?.content && typeof block.content === "object"
      ? block.content
      : {};
  const content = { ...sourceContent };
  const type = String(
    content?.__builderType ||
      block?.blockType ||
      block?.sectionType ||
      block?.type ||
      block?.key ||
      ""
  ).trim().toLowerCase() || null;

  if (type === "hero" && heroAsset?.publicUrl) {
    if (!content.imageUrl && !content.backgroundImage) {
      content.imageUrl = heroAsset.publicUrl;
    }
    if (!content.imageAlt) {
      content.imageAlt = heroAsset.altText || heroAsset.title || "";
    }
  }

  return {
    ...block,
    type,
    blockType: type,
    content,
    ...(hasJsonContent ? { jsonContent: content } : {}),
    settings:
      block?.settings && typeof block.settings === "object"
        ? { ...block.settings }
        : {},
  };
}

function enrichLegalPage(page, legalPages) {
  const html = legalHtmlForSlug(page?.slug, legalPages);
  if (!html || !page) return page;

  const breadcrumbs = (Array.isArray(page.blocks) ? page.blocks : []).filter(
    (block) => (block?.blockType || block?.type) === "breadcrumbs"
  );
  const legalBlock = {
    id: `legal-profile-${page.slug}`,
    type: "rich_text",
    blockType: "rich_text",
    status: "published",
    displayOrder: breadcrumbs.length,
    content: {
      title: page.title || "",
      html,
      alignment: "left",
    },
    settings: {
      source: "legal-profile",
      readOnly: false,
    },
    seo: {},
    visibleDesktop: true,
    visibleMobile: true,
  };

  return {
    ...page,
    blocks: [...breadcrumbs, legalBlock],
    legalProfileContent: html,
    legalProfileApplied: true,
  };
}

function normalizePage(page, runtime = {}) {
  if (!page || typeof page !== "object") return null;

  const heroAsset = runtime?.brand?.assets?.heroDefault || null;
  const legalPages = runtime?.legal?.pages || {};
  const sourceBlocks = Array.isArray(page.blocks)
    ? page.blocks
    : Array.isArray(page.sections)
      ? page.sections
      : [];
  const blocks = sourceBlocks.map((block) => normalizeBlock(block, heroAsset));

  const { sections: _sections, contentBlocks: _contentBlocks, ...rest } = page;
  return enrichLegalPage({ ...rest, blocks }, legalPages);
}

function findRequestedPage(pages, homePage, pageSlug) {
  if (!pageSlug || isHomeSlug(pageSlug)) {
    return homePage || pages.find((page) => isHomeSlug(page?.slug)) || pages[0] || null;
  }
  const wanted = normalizePart(pageSlug);
  return pages.find((page) => normalizePart(page?.slug) === wanted) || null;
}

function buildNavigation(pages, site, homePage) {
  return pages.map((page) => {
    const home = page?.id === homePage?.id || isHomeSlug(page?.slug);
    const path = home
      ? `/agence/${site.slug}`
      : `/agence/${site.slug}/${page.slug}`;

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
  const rawPages = Array.isArray(source?.pages)
    ? source.pages
    : Array.isArray(rawSite?.pages)
      ? rawSite.pages
      : [];
  const pages = rawPages.map((page) => normalizePage(page, runtime));
  const rawHome =
    source?.homePage ||
    source?.home ||
    rawPages.find((page) => isHomeSlug(page?.slug)) ||
    rawPages[0] ||
    null;
  const normalizedHome = rawHome ? normalizePage(rawHome, runtime) : null;
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

  const legal = runtime?.legal || { values: {}, pages: {} };
  const site = {
    ...rawSite,
    slug: rawSite.slug || siteSlug,
    agency,
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

  delete site.pages;
  delete site.homePage;

  const navigation = Array.isArray(source?.navigation) && source.navigation.length
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

async function loadPublicRenderContract(siteSlug, pageSlug = null, requestLike = null) {
  const headers = buildPublicHeaders(requestLike);
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
    const error = new Error(
      siteResult.body?.message || siteResult.body?.error?.message || "Mini-site introuvable"
    );
    error.statusCode = siteResult.response.status;
    error.payload = siteResult.body;
    throw error;
  }

  const contract = compactContractFromSources({
    payload: siteResult.body,
    brandLegalPayload: brandLegalResult.response.ok ? brandLegalResult.body : null,
    siteSlug,
    pageSlug,
  });

  if (contract?.error) {
    const error = new Error(contract.message || contract.error);
    error.statusCode = contract.error === "PUBLIC_SITE_PAGE_NOT_FOUND" ? 404 : 502;
    error.payload = contract;
    throw error;
  }

  return contract;
}

export {
  buildPublicHeaders,
  compactContractFromSources,
  findRequestedPage,
  isHomeSlug,
  legalHtmlForSlug,
  loadPublicRenderContract,
  normalizeBlock,
  normalizePage,
  publicBrandContract,
};
