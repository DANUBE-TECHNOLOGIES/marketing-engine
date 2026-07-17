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

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);

    const backendUrl = new URL(
      `${BACKEND_URL}/knowledge`
    );

    backendUrl.search = requestUrl.search;

    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    return forwardResponse(response);
  } catch (error) {
    return backendUnavailable(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/knowledge`,
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
    return backendUnavailable(error);
  }
}
