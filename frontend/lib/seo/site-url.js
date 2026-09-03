const DEFAULT_SITE_URL = "https://agences.mondescale.com";

export function getPublicSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    DEFAULT_SITE_URL;

  return String(configuredUrl).replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  const siteUrl = getPublicSiteUrl();

  if (!path) {
    return siteUrl;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
