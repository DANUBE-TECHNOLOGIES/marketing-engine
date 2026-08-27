import { NextResponse } from "next/server";

const INTERNAL_FRONTEND_URL = String(
  process.env.INTERNAL_FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
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

function compactPage(page) {
  if (!page || typeof page !== "object") return null;

  const {
    sections: _sections,
    contentBlocks: _contentBlocks,
    ...rest
  } = page;

  const blocks = Array.isArray(page.blocks)
    ? page.blocks
    : Array.isArray(page.sections)
      ? page.sections
      : [];

  return {
    ...rest,
    blocks,
  };
}

function compactSite(site) {
  if (!site || typeof site !== "object") return site;

  const {
    pages: _pages,
    homePage: _homePage,
    ...rest
  } = site;

  return rest;
}

function compactContract(payload, pageSlug) {
  const site = compactSite(
    payload?.site || payload?.website || payload?.miniSite || null
  );

  const selectedPage = compactPage(
    payload?.page ||
      payload?.currentPage ||
      payload?.requestedPage ||
      payload?.homePage ||
      payload?.home ||
      null
  );

  const home = isHomeSlug(pageSlug) ? selectedPage : null;

  return {
    version: payload?.version || "1.2",
    renderContractVersion: "1",
    site,
    agency: payload?.agency || site?.agency || null,
    navigation: Array.isArray(payload?.navigation) ? payload.navigation : [],
    pages: selectedPage ? [selectedPage] : [],
    homePage: home,
    home,
    page: selectedPage,
    metadata: payload?.metadata || null,
  };
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

  const targetPath = pageSlug
    ? `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(pageSlug)}`
    : `/${encodeURIComponent(siteSlug)}`;

  let upstream;

  try {
    upstream = await fetch(
      `${INTERNAL_FRONTEND_URL}/api/public-sites${targetPath}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
      }
    );
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

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(
      payload || {
        error: "PUBLIC_RENDER_UPSTREAM_ERROR",
        message: "Le contrat public du mini-site est indisponible.",
      },
      {
        status: upstream.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const contract = compactContract(payload, pageSlug);

  return NextResponse.json(contract, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
      "x-public-render-contract-version": "1",
      "x-public-render-source-version": String(payload?.version || "1.2"),
    },
  });
}

export const dynamic = "force-dynamic";
export const GET = handler;
export const HEAD = handler;

export {
  compactContract,
  compactPage,
  compactSite,
  isHomeSlug,
  resolvePath,
};
