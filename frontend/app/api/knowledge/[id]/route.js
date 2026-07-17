import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

async function forwardResponse(response) {
  const contentType =
    response.headers.get("content-type") ||
    "application/json";

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}

function backendUnavailable(error) {
  console.error("[KNOWLEDGE_PROXY_ERROR]", error);

  return NextResponse.json(
    {
      error: {
        code: "BACKEND_UNAVAILABLE",
        message:
          "Le service Knowledge est momentanément indisponible.",
      },
    },
    {
      status: 502,
    }
  );
}

async function resolveId(context) {
  const params = await context.params;

  if (!params?.id) {
    throw new Error("Identifiant Knowledge manquant.");
  }

  return encodeURIComponent(params.id);
}

export async function GET(request, context) {
  try {
    const id = await resolveId(context);

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}`,
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
    return backendUnavailable(error);
  }
}

export async function PUT(request, context) {
  try {
    const id = await resolveId(context);
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}`,
      {
        method: "PUT",
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
    return backendUnavailable(error);
  }
}

export async function PATCH(request, context) {
  try {
    const id = await resolveId(context);
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}`,
      {
        method: "PATCH",
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
    return backendUnavailable(error);
  }
}

export async function DELETE(request, context) {
  try {
    const id = await resolveId(context);

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      }
    );

    return forwardResponse(response);
  } catch (error) {
    return backendUnavailable(error);
  }
}
