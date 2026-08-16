"use strict";

export const PARTNER_STAY_LOGO_SOURCES = Object.freeze({
  belambra: {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.belambra.fr/mentions-legales",
    preferredSource: null,
    targetAsset: "/partners/belambra.webp",
    note: "Belambra's official legal notice requires prior written authorisation for reproduction/use of logos and marks. Do not ingest automatically.",
  },
  boomerang: {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.boomerang-voyages.com/",
    preferredSource: null,
    targetAsset: "/partners/boomerang.webp",
    note: "Official brand site confirmed. Acquire only the Boomerang Voyages masterbrand, not Kappa Club, Coralia or Eldorador sub-brands.",
  },
  "mondial-tourisme": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.mondialtourisme.fr/",
    preferredSource: null,
    targetAsset: "/partners/mondial-tourisme.webp",
    note: "Official site and publisher identity confirmed. Master logo asset still needs vetting before ingestion.",
  },
  "plein-vent": {
    status: "official-source-page",
    sourceType: "official-group-brand",
    sourcePage: "https://www.fram.fr/",
    preferredSource: null,
    targetAsset: "/partners/plein-vent.webp",
    note: "Plein Vent is distributed within the FRAM ecosystem. Acquire only a clearly identified Plein Vent masterbrand asset from an official source.",
  },
  solea: {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.solea-voyages.fr/",
    preferredSource: null,
    targetAsset: "/partners/solea.webp",
    note: "Official brand site confirmed. Master logo asset still needs vetting before ingestion.",
  },
  "pacha-tours": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.pachatours.fr/",
    preferredSource: null,
    targetAsset: "/partners/pacha-tours.webp",
    note: "Official brand site confirmed. Master logo asset still needs vetting before ingestion.",
  },
  heliades: {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.heliades.fr/vacances/conditions-generales-utilisations",
    preferredSource: null,
    targetAsset: "/partners/heliades.webp",
    note: "Héliades' official terms prohibit reproduction of its marks and logos without express authorisation. Do not ingest automatically.",
  },
  voyamar: {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.voyamar-vacances.com/vacances/conditions-generales-utilisations",
    preferredSource: null,
    targetAsset: "/partners/voyamar.webp",
    note: "Voyamar's official terms prohibit reproduction of its marks and logos without express authorisation. Do not ingest automatically.",
  },
});

export function getStayLogoSource(partnerId) {
  return PARTNER_STAY_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
