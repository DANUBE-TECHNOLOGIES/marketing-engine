import {
  getBackendOrigin,
  tenantSlug,
} from "../../../../lib/minisite-structured-data/client.js";

function backendSitemapUrl(siteSlug) {
  return `${getBackendOrigin()}/minisite-structured-data/sites/${encodeURIComponent(siteSlug)}/sitemap.xml`;
}

export async function GET(_request, context) {
  const params = await context.params;
  const siteSlug = String(params?.siteSlug || "").trim();

  if (!siteSlug) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let response;
  try {
    response = await fetch(backendSitemapUrl(siteSlug), {
      method: "GET",
      headers: {
        Accept: "application/xml",
        "x-tenant-slug": tenantSlug(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return new Response("Service Unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!response.ok) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const xml = await response.text();
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
