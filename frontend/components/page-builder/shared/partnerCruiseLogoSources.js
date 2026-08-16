"use strict";

export const PARTNER_CRUISE_LOGO_SOURCES = Object.freeze({
  "catlante-catamarans": {
    status: "vetted-source",
    sourceType: "official-site-svg",
    preferredSource: "https://www.catlante-catamarans.com/themes/custom/catlante/logo.svg",
    alternateSource: "https://www.catlante-catamarans.com/sites/default/files/logo-scroll.svg",
    targetAsset: "/partners/catlante-catamarans.webp",
    note: "Both assets are exposed as the homepage brand logo. Preferred source is the theme master logo.svg.",
  },
  cfc: {
    status: "permission-review",
    sourceType: "brand-permission",
    preferredSource: null,
    targetAsset: "/partners/cfc.webp",
    note: "No trustworthy public asset discovered; do not ingest until an authorised source or written permission is confirmed.",
  },
  croisieurope: {
    status: "source-pending",
    sourceType: "official-brand-source",
    preferredSource: null,
    targetAsset: "/partners/croisieurope.webp",
    note: "Homepage discovery exposed no trustworthy brand asset. Continue through an official brand/press source.",
  },
  "explora-journeys": {
    status: "source-pending",
    sourceType: "official-press-kit",
    preferredSource: null,
    targetAsset: "/partners/explora-journeys.webp",
    note: "Homepage discovery only exposed favicon/tile assets. Use the official Media Centre Press Kit instead.",
  },
  hurtigruten: {
    status: "source-pending",
    sourceType: "official-press-library",
    preferredSource: null,
    targetAsset: "/partners/hurtigruten.webp",
    note: "Homepage candidates are Signature Voyages / Original Voyages sub-brand wordmarks, not the Hurtigruten masterbrand. Use the official press media library.",
  },
});

export function getCruiseLogoSource(partnerId) {
  return PARTNER_CRUISE_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
