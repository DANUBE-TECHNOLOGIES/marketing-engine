const API_ROOT = "/api/indexation";

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.details?.message ||
      `Erreur API ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function read(resource, params = {}) {
  const search = new URLSearchParams({ resource });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  return parseResponse(await fetch(`${API_ROOT}?${search.toString()}`, { cache: "no-store" }));
}

async function action(operation, payload = {}, runId = null) {
  return parseResponse(
    await fetch(API_ROOT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation, runId, payload }),
    })
  );
}

export const indexationApi = Object.freeze({
  health: () => read("health"),
  candidates: () => read("candidates"),
  history: (params = {}) => read("history", params),
  properties: () => read("properties"),
  status: ({ siteSlug, siteUrl }) => read("status", { siteSlug, siteUrl }),
  performance: ({ siteUrl, pagePrefix, days = 28, dimensions = "query", rowLimit = 50 }) =>
    read("performance", { siteUrl, pagePrefix, days, dimensions, rowLimit }),
  workQueue: (params = {}) => read("workQueue", params),
  createWorkItem: ({ siteSlug, opportunity, createdBy }) =>
    action("createWorkItem", { siteSlug, opportunity, createdBy: createdBy || null }),
  transitionWorkItem: ({ runId, status, actor, measurement }) =>
    action("transitionWorkItem", { status, actor: actor || null, measurement: measurement || null }, runId),
  preflight: ({ siteSlug, siteUrl }) => action("preflight", { siteSlug, siteUrl }),
  prepare: ({ siteSlug, siteUrl, sitemapUrl, requestedBy }) =>
    action("prepare", { siteSlug, siteUrl, sitemapUrl, requestedBy: requestedBy || null }),
  approve: ({ runId, approvedBy }) => action("approve", { approvedBy }, runId),
  submit: ({ runId }) => action("submit", {}, runId),
});
