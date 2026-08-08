import {
  NextResponse,
} from "next/server";

const BACKEND_URL =
  String(
    process.env
      .MONDESCALE_BACKEND_URL ||
    process.env
      .BACKEND_URL ||
    "http://backend:4000"
  ).replace(
    /\/+$/,
    ""
  );

const FORWARDED_HEADERS = [
  "authorization",
  "cookie",
  "content-type",
  "accept",
  "x-tenant-id",
  "x-tenant-slug",
  "x-request-id",
];

function copyRequestHeaders(
  request
) {
  const headers =
    new Headers();

  for (
    const name
    of FORWARDED_HEADERS
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

  /*
   * Le tenant historique du Local Engine reste Mondescale
   * lorsque l’interface n’a pas reçu d’en-tête explicite.
   */
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

function buildBackendUrl({
  prefix,
  path,
  request,
}) {
  const pathParts =
    Array.isArray(path)
      ? path
      : [];

  const suffix =
    pathParts.length
      ? `/${pathParts
          .map(
            encodeURIComponent
          )
          .join("/")}`
      : "";

  const source =
    new URL(
      request.url
    );

  return (
    `${BACKEND_URL}${prefix}${suffix}` +
    source.search
  );
}

export async function proxyBackendRequest({
  request,
  prefix,
  path,
}) {
  const method =
    request.method
      .toUpperCase();

  const headers =
    copyRequestHeaders(
      request
    );

  const options = {
    method,
    headers,
    redirect:
      "manual",
    cache:
      "no-store",
  };

  if (
    ![
      "GET",
      "HEAD",
    ].includes(
      method
    )
  ) {
    options.body =
      await request.arrayBuffer();
  }

  let response;

  try {
    response =
      await fetch(
        buildBackendUrl({
          prefix,
          path,
          request,
        }),
        options
      );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "BACKEND_UNAVAILABLE",

        message:
          "Le service Brand Studio est indisponible.",

        details: {
          cause:
            error?.message ||
            "Connexion impossible",
        },
      },
      {
        status:
          502,
      }
    );
  }

  const responseHeaders =
    new Headers();

  const contentType =
    response.headers.get(
      "content-type"
    );

  if (contentType) {
    responseHeaders.set(
      "content-type",
      contentType
    );
  }

  const contentDisposition =
    response.headers.get(
      "content-disposition"
    );

  if (contentDisposition) {
    responseHeaders.set(
      "content-disposition",
      contentDisposition
    );
  }

  return new NextResponse(
    response.body,
    {
      status:
        response.status,

      headers:
        responseHeaders,
    }
  );
}
