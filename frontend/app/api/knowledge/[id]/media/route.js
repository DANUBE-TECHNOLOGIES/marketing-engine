import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

async function resolveId(context) {
  const params = await context.params;

  if (!params?.id) {
    throw new Error(
      "Identifiant Knowledge manquant."
    );
  }

  return encodeURIComponent(params.id);
}

async function forwardResponse(response) {
  const contentType =
    response.headers.get("content-type") ||
    "application/json";

  return new NextResponse(
    await response.text(),
    {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    }
  );
}

function unavailable(error) {
  console.error(
    "[KNOWLEDGE_MEDIA_PROXY_ERROR]",
    error
  );

  return NextResponse.json(
    {
      error: {
        code: "BACKEND_UNAVAILABLE",
        message:
          "La médiathèque est momentanément indisponible.",
      },
    },
    {
      status: 502,
    }
  );
}

export async function GET(request, context) {
  try {
    const id = await resolveId(context);

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/media`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      }
    );

    return forwardResponse(response);
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request, context) {
  try {
    const id = await resolveId(context);
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/media`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body,
      }
    );

    return forwardResponse(response);
  } catch (error) {
    return unavailable(error);
  }
}
