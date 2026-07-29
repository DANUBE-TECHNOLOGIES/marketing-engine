const API_BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:4000";

async function api(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Agency Site API ${response.status}: ${path}`);
  return response.json();
}

export function getAgencySite(siteSlug) {
  return api(`/public/agency-sites/${encodeURIComponent(siteSlug)}`);
}

export function getAgencyPage(siteSlug, pageSlug = "") {
  const suffix = pageSlug ? `/pages/${encodeURIComponent(pageSlug)}` : "/pages/home";
  return api(`/public/agency-sites/${encodeURIComponent(siteSlug)}${suffix}`);
}
