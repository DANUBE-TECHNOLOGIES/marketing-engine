"use strict";

export const PARTNER_CRUISE_LOGO_SOURCES = Object.freeze({
  "catlante-catamarans": {
    status: "vetted-source",
    sourceType: "official-site-svg",
    preferredSource: "https://www.catlante-catamarans.com/themes/custom/catlante/logo.svg",
    alternateSource: "https://www.catlante-catamarans.com/sites/default/files/logo-scroll.svg",
    targetAsset: "/partners/catlante-catamarans.svg",
    note: "Both assets are exposed as the homepage brand logo. Preferred source is the theme master logo.svg. Keep native SVG when no safe raster converter is available.",
  },
  cfc: {
    status: "permission-review",
    sourceType: "brand-permission",
    preferredSource: null,
    targetAsset: "/partners/cfc.webp",
    note: "Do not ingest automatically. Logo reproduction requires an authorised source or explicit permission.",
  },
  croisieurope: {
    status: "official-source-page",
    sourceType: "official-press-room",
    preferredSource: null,
    sourcePage: "https://www.croisieurope.com/information/salle-presse",
    targetAsset: "/partners/croisieurope.webp",
    note: "Official press room is confirmed and points to the 2026 press pack / professional media resources. Acquire the master logo from those official resources rather than scraping payment or UI icons.",
  },
  "rivages-du-monde": {
    status: "official-source-page",
    sourceType: "official-site",
    preferredSource: null,
    sourcePage: "https://www.rivagesdumonde.fr/",
    targetAsset: "/partners/rivages-du-monde.webp",
    note: "Official Rivages du Monde site confirms the cruise masterbrand. Discover and vet the exact master logo before ingestion; do not substitute ship, itinerary or editorial artwork.",
  },
  "explora-journeys": {
    status: "official-source-page",
    sourceType: "official-press-kit",
    preferredSource: null,
    sourcePage: "https://explorajourneys.com/fr/fr/press-and-media/media-contacts",
    targetAsset: "/partners/explora-journeys.webp",
    note: "Official Media Centre explicitly exposes a Press Kit. Use a masterbrand asset from that kit; homepage favicon/tile candidates are rejected.",
  },
  hurtigruten: {
    status: "official-source-page",
    sourceType: "official-press-library",
    preferredSource: null,
    sourcePage: "https://press.hurtigruten.com/latest_media",
    targetAsset: "/partners/hurtigruten.webp",
    note: "Official newsroom media library is confirmed. Homepage candidates are Signature/Original sub-brand wordmarks and are rejected. Only ingest the Hurtigruten masterbrand when identified in the official library.",
  },
});

export function getCruiseLogoSource(partnerId) {
  return PARTNER_CRUISE_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
