import {
  NextResponse,
} from "next/server";

const BACKEND_URL =
  String(
    process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
  ).replace(
    /\/+$/,
    ""
  );

function normalizeParts(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (part) =>
        String(
          part ||
          ""
        )
          .trim()
          .replace(
            /^\/+|\/+$/g,
            ""
          )
    )
    .filter(Boolean);
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

async function handler(
  request,
  context
) {
  const params =
    await context.params;

  const parts =
    normalizeParts(
      params.path
    );

  const suffix =
    parts.length
      ? `/${parts
          .map(
            encodeURIComponent
          )
          .join("/")}`
      : "";

  const target =
    `${BACKEND_URL}/api/agency-launch${suffix}`;

  let body;
  if (request.method !== "GET") {
    const text = await request.text();
    body = text || undefined;
  }

  let response;

  try {
    response =
      await fetch(
        target,
        {
          method: request.method,
          headers:
            forwardedHeaders(
              request
            ),
          body,
          cache:
            "no-store",
          signal:
            AbortSignal.timeout(
              30000
            ),
        }
      );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "AGENCY_LAUNCH_SERVICE_UNAVAILABLE",

        message:
          "Le service de préparation à la mise en ligne est indisponible.",

        details: {
          cause:
            error?.message ||
            "fetch failed",
        },
      },
      {
        status:
          502,
      }
    );
  }

  const text =
    await response.text();

  let responseBody;

  try {
    responseBody =
      JSON.parse(
        text
      );
  } catch {
    responseBody = {
      error:
        "INVALID_AGENCY_LAUNCH_RESPONSE",

      message:
        "Le service Agency Launch a retourné une réponse invalide.",

      details: {
        preview:
          text.slice(
            0,
            500
          ),
      },
    };
  }

  return NextResponse.json(
    responseBody,
    {
      status:
        response.status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export {
  handler as GET,
  handler as POST,
};
