import { NextResponse } from "next/server";
import {
  loadPublicRenderContract,
} from "../../../../lib/public-render-contract.js";

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

  let contract;

  try {
    contract = await loadPublicRenderContract(siteSlug, pageSlug, request);
  } catch (error) {
    return NextResponse.json(
      error?.payload || {
        error: "PUBLIC_RENDER_UPSTREAM_UNAVAILABLE",
        message: "Le contrat public du mini-site est indisponible.",
        details: { cause: error?.message || "Connexion impossible" },
      },
      {
        status: Number(error?.statusCode || 502),
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(contract, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 2}`,
      "x-public-render-contract-version": "1",
      "x-public-render-source-version": String(contract?.version || "1.2"),
      "x-public-render-source": "backend-direct-shared",
    },
  });
}

export const dynamic = "force-dynamic";
export const GET = handler;
export const HEAD = handler;

export { resolvePath };
