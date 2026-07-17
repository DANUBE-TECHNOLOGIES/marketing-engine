import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

async function resolveParams(context) {
  const params = await context.params;

  if (!params?.id || !params?.blockId) {
    throw new Error(
      "Identifiant Knowledge ou bloc manquant."
    );
  }

  return {
    id: encodeURIComponent(params.id),
    blockId: encodeURIComponent(params.blockId),
  };
}

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
  console.error("[KNOWLEDGE_BLOCK_PROXY_ERROR]", error);

  return NextResponse.json(
    {
      error: {
        code: "BACKEND_UNAVAILABLE",
        message:
          "Le Block Engine est momentanément indisponible.",
      },
    },
    {
      status: 502,
    }
  );
}

export async function PATCH(request, context) {
  try {
    const { id, blockId } =
      await resolveParams(context);

    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/blocks/${blockId}`,
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

export async function PUT(request, context) {
  try {
    const { id, blockId } =
      await resolveParams(context);

    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/blocks/${blockId}`,
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

export async function DELETE(request, context) {
  try {
    const { id, blockId } =
      await resolveParams(context);

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/blocks/${blockId}`,
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
