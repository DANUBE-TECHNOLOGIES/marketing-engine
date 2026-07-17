import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

async function resolveParams(context) {
  const params = await context.params;

  if (!params?.id || !params?.mediaId) {
    throw new Error(
      "Identifiant Knowledge ou média manquant."
    );
  }

  return {
    id: encodeURIComponent(params.id),
    mediaId: encodeURIComponent(
      params.mediaId
    ),
  };
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

export async function PATCH(request, context) {
  try {
    const { id, mediaId } =
      await resolveParams(context);

    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/media/${mediaId}`,
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
    return unavailable(error);
  }
}

export async function PUT(request, context) {
  try {
    const { id, mediaId } =
      await resolveParams(context);

    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/media/${mediaId}`,
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
    return unavailable(error);
  }
}

export async function DELETE(request, context) {
  try {
    const { id, mediaId } =
      await resolveParams(context);

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/media/${mediaId}`,
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
    return unavailable(error);
  }
}
