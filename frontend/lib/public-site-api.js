const INTERNAL_API_URL =
  process.env.INTERNAL_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

async function request(path) {
  const response = await fetch(
    `${INTERNAL_API_URL}/api/public-sites${path}`,
    {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  const payload = contentType.includes(
    "application/json"
  )
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload?.error?.debug?.message ||
        payload?.error?.message ||
        payload?.message ||
        "Mini-site introuvable"
    );

    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

export const publicSiteApi = {
  getSite(siteSlug) {
    return request(
      `/${encodeURIComponent(siteSlug)}`
    );
  },

  getHome(siteSlug) {
    return request(
      `/${encodeURIComponent(siteSlug)}/pages/home`
    );
  },

  getPage(siteSlug, pageSlug) {
    return request(
      `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(
        pageSlug
      )}`
    );
  },
};
