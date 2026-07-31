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
      (typeof payload === "string" && payload) ||
      `Erreur API ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export const campaignApi = {
  list: () => request(),
  create: (data) =>
    request("", { method: "POST", body: JSON.stringify(data) }),
  get: (id) => request(`/${encodeURIComponent(id)}`),
  generate: (id) =>
    request(`/${encodeURIComponent(id)}/generate`, {
      method: "POST",
      body: "{}",
    }),
  tasks: (id) => request(`/${encodeURIComponent(id)}/tasks`),
  assets: (id) => request(`/${encodeURIComponent(id)}/assets`),
};
