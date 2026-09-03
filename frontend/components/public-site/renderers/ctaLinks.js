"use strict";

const PUBLIC_ROUTE_ALIASES = Object.freeze({
  inspirations: "inspiration",
});

const QUOTE_LABEL_PATTERN = /\b(devis|estimation|chiffrage)\b/i;

function siteRoot(site) {
  const explicitBasePath = String(site?.basePath || "").trim();
  if (explicitBasePath) return explicitBasePath.replace(/\/$/, "");

  const slug = String(site?.slug || "").trim();
  return slug
    ? `/agence/${encodeURIComponent(slug)}`
    : "/";
}

function canonicalPublicSlug(slug = "") {
  const normalized = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!normalized) return "";

  const parts = normalized.split("/").filter(Boolean);
  const first = String(parts[0] || "").toLowerCase();

  if (Object.prototype.hasOwnProperty.call(PUBLIC_ROUTE_ALIASES, first)) {
    parts[0] = PUBLIC_ROUTE_ALIASES[first];
  }

  return parts.join("/");
}

function sitePageHref(site, slug = "") {
  const root = siteRoot(site);
  const normalized = canonicalPublicSlug(slug);

  if (!normalized) return root;

  return `${root}/${normalized
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function isQuoteCtaLabel(label) {
  return QUOTE_LABEL_PATTERN.test(
    String(label || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  );
}

function quoteRequestHref(site, { source = "general" } = {}) {
  const allowedSource = ["general", "group", "business"].includes(source)
    ? source
    : "general";

  return `${sitePageHref(site, "demande-devis")}?source=${encodeURIComponent(allowedSource)}`;
}

function isAllowedAbsoluteHref(value) {
  return /^(https?:|mailto:|tel:)/i.test(value);
}

function isAgencyScopedPublicPath(value) {
  return /^\/(?:contact|services|equipe|team|destinations|partenaires|partners|inspiration|inspirations|demande-devis)(?:\/|$)/i.test(value);
}

export function resolvePublicCtaHref(
  site,
  href,
  fallbackSlug = "contact",
  options = {}
) {
  const label = options?.label || "";
  if (isQuoteCtaLabel(label)) {
    return quoteRequestHref(site, { source: options?.source || "general" });
  }

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

export {
  PUBLIC_ROUTE_ALIASES,
  QUOTE_LABEL_PATTERN,
  canonicalPublicSlug,
  isQuoteCtaLabel,
  quoteRequestHref,
  sitePageHref,
  siteRoot,
};
