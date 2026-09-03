const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  process.env.TENANT_SLUG ||
  "mondescale";

function rollbackPath(
  agencyId,
  pageSlug,
  versionId
) {
  return `/agencies/${encodeURIComponent(
    agencyId
  )}/site/pages/${encodeURIComponent(
    pageSlug
  )}/versions/${encodeURIComponent(
    versionId
  )}/rollback`;
}

export async function POST(
  request,
  context
) {
  const {
    agencyId,
    pageSlug,
    versionId,
  } = await context.params;

  const response = await fetch(
    `${BACKEND_URL}${rollbackPath(
      agencyId,
      pageSlug,
      versionId
    )}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type":
          "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
      body: await request.text(),
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
