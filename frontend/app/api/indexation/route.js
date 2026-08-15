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
  workQueue: "/seo-opportunity-work-queue",
});

function jsonError(message, status = 500, details = null) {
  return Response.json({ error: "INDEXATION_COCKPIT_PROXY_ERROR", message, details }, { status });
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
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text || null; }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error?.message || `Erreur backend ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function statusPath(url) {
  const siteSlug = String(url.searchParams.get("siteSlug") || "").trim();
  const siteUrl = String(url.searchParams.get("siteUrl") || "").trim();
  if (!siteSlug || !siteUrl) return null;
  const backendUrl = new URL(`/search-console-submissions/sites/${encodeURIComponent(siteSlug)}/status`, BACKEND_URL);
  backendUrl.searchParams.set("siteUrl", siteUrl);
  return `${backendUrl.pathname}${backendUrl.search}`;
}

function performancePath(url) {
  const siteUrl = String(url.searchParams.get("siteUrl") || "").trim();
  if (!siteUrl) return null;
  const backendUrl = new URL("/search-console-submissions/performance", BACKEND_URL);
  backendUrl.searchParams.set("siteUrl", siteUrl);
  for (const key of ["pagePrefix", "days", "dimensions", "rowLimit"]) {
    const value = url.searchParams.get(key);
    if (value) backendUrl.searchParams.set(key, value);
  }
  return `${backendUrl.pathname}${backendUrl.search}`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "candidates";
  const path = resource === "status" ? statusPath(url) : resource === "performance" ? performancePath(url) : READ_RESOURCES[resource];
  if (!path) return jsonError("Ressource cockpit inconnue ou incomplète.", 400, { resource });
  try {
    const backendUrl = new URL(path, BACKEND_URL);
    if (resource === "history" || resource === "workQueue") {
      const status = url.searchParams.get("status");
      const limit = url.searchParams.get("limit");
      if (status) backendUrl.searchParams.set("status", status);
      if (limit) backendUrl.searchParams.set("limit", limit);
    }
    return Response.json(await backendRequest(`${backendUrl.pathname}${backendUrl.search}`));
  } catch (error) {
    return jsonError(error.message, Number(error.status || 500), error.payload || null);
  }
}

function actionPath(operation, runId) {
  switch (operation) {
    case "preflight": return "/search-console-submissions/preflight";
    case "prepare": return "/search-console-submissions/prepare";
    case "approve": return runId ? `/search-console-submissions/${encodeURIComponent(runId)}/approve` : null;
    case "submit": return runId ? `/search-console-submissions/${encodeURIComponent(runId)}/submit` : null;
    case "createWorkItem": return "/seo-opportunity-work-queue";
    case "transitionWorkItem": return runId ? `/seo-opportunity-work-queue/${encodeURIComponent(runId)}/status` : null;
    default: return null;
  }
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return jsonError("Payload JSON invalide.", 400); }
  const operation = String(body?.operation || "").trim();
  const runId = String(body?.runId || "").trim();
  const path = actionPath(operation, runId);
  if (!path) return jsonError("Action cockpit inconnue ou incomplète.", 400, { operation, runId: runId || null });
  try {
    return Response.json(await backendRequest(path, { method: "POST", body: JSON.stringify({ ...(body?.payload || {}) }) }));
  } catch (error) {
    return jsonError(error.message, Number(error.status || 500), error.payload || null);
  }
}
