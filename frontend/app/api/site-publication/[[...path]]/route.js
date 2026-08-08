import {
  NextResponse,
} from "next/server";

const BACKEND_ORIGIN =
  String(
    process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
  ).replace(
    /\/+$/,
    ""
  );

const ALLOWED_METHODS =
  new Set([
    "GET",
    "POST",
  ]);

function requestPath(
  context
) {
  const parts =
    context?.params?.path ||
    [];

  if (
    !Array.isArray(parts) ||
    !parts.length
  ) {
    return "";
  }

  return parts
    .map(
      (part) =>
        encodeURIComponent(
          String(part)
        )
    )
    .join("/");
}

function forwardedHeaders(
  request
) {
  const headers =
    new Headers();

  for (
    const name
    of [
      "accept",
      "authorization",
      "content-type",
      "cookie",
      "x-tenant-id",
      "x-tenant-slug",
      "x-request-id",
      "x-user-id",
      "x-user-name",
    ]
  ) {
    const value =
      request.headers.get(
        name
      );

    if (value) {
      headers.set(
        name,
        value
      );
    }
  }

  if (
    !headers.has(
      "accept"
    )
  ) {
    headers.set(
      "accept",
      "application/json"
    );
  }

  if (
    !headers.has(
      "x-tenant-id"
    ) &&
    !headers.has(
      "x-tenant-slug"
    )
  ) {
    headers.set(
      "x-tenant-slug",
      "mondescale"
    );
  }

  return headers;
}

async function proxy(
  request,
  context
) {
  if (
    !ALLOWED_METHODS.has(
      request.method
    )
  ) {
    return NextResponse.json(
      {
        error:
          "METHOD_NOT_ALLOWED",

        message:
          "Méthode non autorisée.",
      },
      {
        status:
          405,
      }
    );
  }

  const path =
    requestPath(
      context
    );

  if (!path) {
    return NextResponse.json(
      {
        error:
          "SITE_PUBLICATION_PATH_REQUIRED",

        message:
          "Le chemin de publication est obligatoire.",
      },
      {
        status:
          400,
      }
    );
  }

  const sourceUrl =
    new URL(
      request.url
    );

  const targetUrl =
    `${BACKEND_ORIGIN}/api/site-publication/${path}` +
    sourceUrl.search;

  let body;

  if (
    request.method !== "GET"
  ) {
    const text =
      await request.text();

    body =
      text || undefined;
  }

  let response;

  try {
    response =
      await fetch(
        targetUrl,
        {
          method:
            request.method,

          headers:
            forwardedHeaders(
              request
            ),

          body,

          cache:
            "no-store",

          redirect:
            "manual",

          signal:
            AbortSignal.timeout(
              120000
            ),
        }
      );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "SITE_PUBLICATION_BACKEND_UNAVAILABLE",

        message:
          "Le service de publication est indisponible.",

        details: {
          cause:
            error.message,
        },
      },
      {
        status:
          502,
      }
    );
  }

  const responseBody =
    await response.arrayBuffer();

  const headers =
    new Headers();

  const contentType =
    response.headers.get(
      "content-type"
    );

  if (contentType) {
    headers.set(
      "content-type",
      contentType
    );
  }

  headers.set(
    "cache-control",
    "no-store"
  );

  return new NextResponse(
    responseBody,
    {
      status:
        response.status,

      headers,
    }
  );
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

export const dynamic =
  "force-dynamic";
