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
   * params peut être une Promise dans les Route Handlers.
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
      .filter(
        Boolean
      )
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

  const url =
    new URL(
      `${BACKEND_URL}/api/template-library${suffix}`
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
    url.searchParams.append(
      key,
      value
    );
  }

  return url;
}

async function proxy(
  request,
  context
) {
  try {
    const url =
      await buildBackendUrl(
        request,
        context
      );

    const headers =
      new Headers();

    const tenantSlug =
      request.headers.get(
        "x-tenant-slug"
      ) ||
      "mondescale";

    headers.set(
      "x-tenant-slug",
      tenantSlug
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
        url,
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

    const text =
      await response.text();

    return new NextResponse(
      text,
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
          "TEMPLATE_LIBRARY_PROXY_ERROR",

        message:
          error?.message ||
          "Erreur proxy Template Library.",
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

export async function PUT(
  request,
  context
) {
  return proxy(
    request,
    context
  );
}

export async function PATCH(
  request,
  context
) {
  return proxy(
    request,
    context
  );
}

export async function DELETE(
  request,
  context
) {
  return proxy(
    request,
    context
  );
}
