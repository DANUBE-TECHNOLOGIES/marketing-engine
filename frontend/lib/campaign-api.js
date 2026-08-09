const API_URL = "/api/campaigns";

async function request(path = "", options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.error?.debug?.message ||
      payload?.error?.message ||
      payload?.message ||
      (typeof payload === "string" && payload) ||
      `Erreur API ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function assetQuery(filters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const campaignApi = {
  list: () => request(),

  create: (data) =>
    request("", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id) =>
    request(`/${encodeURIComponent(id)}`),

  generate: (id) =>
    request(`/${encodeURIComponent(id)}/generate`, {
      method: "POST",
      body: "{}",
    }),

  tasks: (id) =>
    request(`/${encodeURIComponent(id)}/tasks`),

  assets: (id, filters = {}) =>
    request(
      `/${encodeURIComponent(id)}/assets${assetQuery(filters)}`
    ),

  createOffer: (id, data) =>
    request(`/${encodeURIComponent(id)}/assets/offers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  approveAsset: (campaignId, assetId, data = {}) =>
    request(
      `/${encodeURIComponent(campaignId)}/assets/${encodeURIComponent(
        assetId
      )}/approve`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  rejectAsset: (campaignId, assetId, data = {}) =>
    request(
      `/${encodeURIComponent(campaignId)}/assets/${encodeURIComponent(
        assetId
      )}/reject`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
};
