const API_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://backend:4000";

async function fetchJson(path) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

export async function getPublishedAgencySitesForSeo() {
  const candidates = [
    "/public/agency-sites",
    "/public/agency-sites?status=published",
  ];

  for (const path of candidates) {
    const payload = await fetchJson(path);
    const sites = asArray(payload);

    if (sites.length > 0) {
      return sites;
    }
  }

  return [];
}

export async function getPublishedDestinationsForSeo() {
  const candidates = [
    "/public/destinations",
    "/public/destinations?status=published",
  ];

  for (const path of candidates) {
    const payload = await fetchJson(path);
    const destinations = asArray(payload);

    if (destinations.length > 0) {
      return destinations;
    }
  }

  return [];
}
