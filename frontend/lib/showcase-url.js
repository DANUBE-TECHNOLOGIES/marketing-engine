const DEFAULT_SHOWCASE_URL = "https://www.mondescale.com";

function normalizeExternalUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    if (url.hostname.toLowerCase() === "mondescale.com") {
      url.hostname = "www.mondescale.com";
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getShowcaseUrl(site) {
  const configured =
    normalizeExternalUrl(process.env.NEXT_PUBLIC_SHOWCASE_URL) ||
    normalizeExternalUrl(site?.agency?.website) ||
    normalizeExternalUrl(site?.website);

  return configured || DEFAULT_SHOWCASE_URL;
}

export { DEFAULT_SHOWCASE_URL, normalizeExternalUrl };
