import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://backend:4000";

export async function POST(request, context) {
  try {
    const params = await context.params;

    if (!params?.id) {
      throw new Error(
        "Identifiant Knowledge manquant."
      );
    }

    const id = encodeURIComponent(params.id);
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge/${id}/blocks/reorder`,
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
  } catch (error) {
    console.error(
      "[KNOWLEDGE_BLOCK_REORDER_PROXY_ERROR]",
      error
    );

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
}
