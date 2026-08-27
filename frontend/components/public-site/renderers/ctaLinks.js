"use strict";

function siteRoot(site) {
  const explicitBasePath = String(site?.basePath || "").trim();
  if (explicitBasePath) return explicitBasePath.replace(/\/$/, "");

  const slug = String(site?.slug || "").trim();
  return slug
    ? `/agence/${encodeURIComponent(slug)}`
    : "/";
}

function sitePageHref(site, slug = "") {
  const root = siteRoot(site);
  const normalized = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!normalized) return root;

  return `${root}/${normalized
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function isAllowedAbsoluteHref(value) {
  return /^(https?:|mailto:|tel:)/i.test(value);
}

function isAgencyScopedPublicPath(value) {
  return /^\/(?:contact|services|equipe|team|destinations|partenaires|partners|inspiration|inspirations)(?:\/|$)/i.test(value);
}

export function resolvePublicCtaHref(
  site,
  href,
  fallbackSlug = "contact"
) {
  const value = String(href || "").trim();
  const fallback = sitePageHref(site, fallbackSlug);

  if (!value) return fallback;

  if (/^(javascript:|data:|vbscript:)/i.test(value)) {
    return fallback;
  }

  if (value.startsWith("#")) {
    return value;
  }

  if (isAllowedAbsoluteHref(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return isAgencyScopedPublicPath(value)
      ? sitePageHref(site, value)
      : value;
  }

  return sitePageHref(site, value);
}

export function phoneHref(phone) {
  const normalized = String(phone || "")
    .replace(/[^+\d]/g, "");

  return normalized ? `tel:${normalized}` : null;
}

export { sitePageHref, siteRoot };
