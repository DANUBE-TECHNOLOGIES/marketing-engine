const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.TENANT_SLUG ||
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

const READ_RESOURCES = Object.freeze({
  health: "/search-console-submissions/health",
  candidates: "/search-console-submissions/candidates",
  history: "/search-console-submissions",
  properties: "/search-console-submissions/properties",
});

function jsonError(message, status = 500, details = null) {
  return Response.json(
    {
      error: "INDEXATION_COCKPIT_PROXY_ERROR",
      message,
      details,
    },
    { status }
  );
}

async function backendRequest(path, options = {}) {
  const response = await fetch(new URL(path, BACKEND_URL), {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-tenant-slug": TENANT_SLUG,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text || null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      `Erreur backend ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function GET(request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "candidates";
  const path = READ_RESOURCES[resource];

  if (!path) {
    return jsonError("Ressource cockpit inconnue.", 400, { resource });
  }

  try {
    const backendUrl = new URL(path, BACKEND_URL);

    if (resource === "history") {
      const status = url.searchParams.get("status");
      const limit = url.searchParams.get("limit");
      if (status) backendUrl.searchParams.set("status", status);
      if (limit) backendUrl.searchParams.set("limit", limit);
    }

    return Response.json(
      await backendRequest(`${backendUrl.pathname}${backendUrl.search}`)
    );
  } catch (error) {
    return jsonError(
      error.message,
      Number(error.status || 500),
      error.payload || null
    );
  }
}

function actionPath(operation, runId) {
  switch (operation) {
    case "preflight":
      return "/search-console-submissions/preflight";
    case "prepare":
      return "/search-console-submissions/prepare";
    case "approve":
      return runId
        ? `/search-console-submissions/${encodeURIComponent(runId)}/approve`
        : null;
    case "submit":
      return runId
        ? `/search-console-submissions/${encodeURIComponent(runId)}/submit`
        : null;
    default:
      return null;
  }
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonError("Payload JSON invalide.", 400);
  }

  const operation = String(body?.operation || "").trim();
  const runId = String(body?.runId || "").trim();
  const path = actionPath(operation, runId);

  if (!path) {
    return jsonError("Action cockpit inconnue ou incomplète.", 400, {
      operation,
      runId: runId || null,
    });
  }

  const payload = { ...(body?.payload || {}) };

  try {
    return Response.json(
      await backendRequest(path, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
  } catch (error) {
    return jsonError(
      error.message,
      Number(error.status || 500),
      error.payload || null
    );
  }
}
