const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  process.env.TENANT_SLUG ||
  "mondescale";

function pagePath(agencyId, pageSlug) {
  return `/agencies/${encodeURIComponent(
    agencyId
  )}/site/pages/${encodeURIComponent(
    pageSlug
  )}/versions`;
}

export async function GET(
  request,
  context
) {
  const {
    agencyId,
    pageSlug,
  } = await context.params;

  const response = await fetch(
    `${BACKEND_URL}${pagePath(
      agencyId,
      pageSlug
    )}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
      cache: "no-store",
    }
  );

  const body =
    await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get(
          "content-type"
        ) ||
        "application/json",
    },
  });
}
