"use strict";

const NETWORK_PARTNER_ALIASES = Object.freeze(new Set([
  "fram",
  "tui-univers",
  "tui-france",
  "tui",
  "club-lookea",
  "club-marmara",
  "nouvelles-frontieres",
  "club-med",
  "msc-croisieres",
  "costa-croisieres",
  "kuoni",
  "exotismes",
]));

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function partnerKey(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function safePartnerHref(value, { allowInternal = true } = {}) {
  const href = text(value);
  if (!href) return "";
  const isInternalPath = href.startsWith("/") && !href.startsWith("//");
  if (allowInternal && (isInternalPath || href.startsWith("#"))) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function safePartnerAssetUrl(value) {
  const assetUrl = text(value);
  if (!assetUrl || assetUrl.startsWith("#")) return "";
  return safePartnerHref(assetUrl, { allowInternal: true });
}

function networkKeys(networkItems = []) {
  const keys = new Set(NETWORK_PARTNER_ALIASES);
  for (const item of Array.isArray(networkItems) ? networkItems : []) {
    for (const candidate of [item?.id, item?.name, item?.title]) {
      const key = partnerKey(candidate);
      if (key) keys.add(key);
    }
    for (const child of Array.isArray(item?.children) ? item.children : []) {
      for (const candidate of [child?.id, child?.name, child?.title]) {
        const key = partnerKey(candidate);
        if (key) keys.add(key);
      }
    }
  }
  return keys;
}

export function selectAgencyPartners(items = [], { networkItems = [], max = 3 } = {}) {
  const reserved = networkKeys(networkItems);
  const seen = new Set();
  const selected = [];
  const limit = Math.max(0, Math.min(3, Number(max) || 3));

  for (const source of Array.isArray(items) ? items : []) {
    if (!source || typeof source !== "object") continue;
    const name = text(source.name || source.title);
    const id = partnerKey(source.id || name);
    const nameKey = partnerKey(name);
    if (!name || !nameKey) continue;
    if (reserved.has(id) || reserved.has(nameKey)) continue;
    if (seen.has(id) || seen.has(nameKey)) continue;

    const logo = safePartnerAssetUrl(source.logoUrl || source.logo || source.imageUrl);
    const href = safePartnerHref(source.href || source.url || source.link);

    selected.push({
      ...source,
      id: text(source.id) || nameKey,
      name,
      logoUrl: logo,
      href,
      alt: text(source.alt) || `Logo ${name}`,
      scope: "agency",
    });
    seen.add(id);
    seen.add(nameKey);
    if (selected.length >= limit) break;
  }

  return selected;
}
