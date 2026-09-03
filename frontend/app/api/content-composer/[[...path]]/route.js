import {
  NextResponse,
} from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

async function resolvePath(
  context
) {
  /*
   * Next.js 16 :
   * context.params peut être une Promise.
   */
  const params =
    await Promise.resolve(
      context?.params ||
      {}
    );

  const rawPath =
    params?.path;

  if (
    Array.isArray(
      rawPath
    )
  ) {
    return rawPath
      .filter(Boolean)
      .join("/");
  }

  if (
    typeof rawPath ===
    "string"
  ) {
    return rawPath;
  }

  return "";
}

async function buildBackendUrl(
  request,
  context
) {
  const pathname =
    await resolvePath(
      context
    );

  const suffix =
    pathname
      ? `/${pathname}`
      : "";

  const target =
    new URL(
      `${BACKEND_URL}/api/content-composer${suffix}`
    );

  const incoming =
    new URL(
      request.url
    );

  for (
    const [
      key,
      value,
    ]
    of incoming.searchParams.entries()
  ) {
    target.searchParams.append(
      key,
      value
    );
  }

  return target;
}

async function proxy(
  request,
  context
) {
  try {
    const target =
      await buildBackendUrl(
        request,
        context
      );

    const headers =
      new Headers();

    headers.set(
      "x-tenant-slug",
      request.headers.get(
        "x-tenant-slug"
      ) ||
      "mondescale"
    );

    const tenantId =
      request.headers.get(
        "x-tenant-id"
      );

    if (tenantId) {
      headers.set(
        "x-tenant-id",
        tenantId
      );
    }

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (contentType) {
      headers.set(
        "content-type",
        contentType
      );
    }

    let body;

    if (
      ![
        "GET",
        "HEAD",
      ].includes(
        request.method
      )
    ) {
      body =
        await request.text();
    }

    const response =
      await fetch(
        target,
        {
          method:
            request.method,

          headers,

          body:
            body ||
            undefined,

          cache:
            "no-store",
        }
      );

    const responseBody =
      await response.text();

    return new NextResponse(
      responseBody,
      {
        status:
          response.status,

        headers: {
          "content-type":
            response.headers.get(
              "content-type"
            ) ||
            "application/json",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "CONTENT_COMPOSER_PROXY_ERROR",

        message:
          error?.message ||
          "Erreur proxy Content Composer.",
      },
      {
        status:
          500,
      }
    );
  }
}

export async function GET(
  request,
  context
) {
  return proxy(
    request,
    context
  );
}

export async function POST(
  request,
  context
) {
  return proxy(
    request,
    context
  );
}
