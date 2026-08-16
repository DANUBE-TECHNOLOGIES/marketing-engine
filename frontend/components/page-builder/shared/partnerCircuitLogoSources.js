"use strict";

export const PARTNER_CIRCUIT_LOGO_SOURCES = Object.freeze({
  "double-sens": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.doublesens.fr/",
    preferredSource: null,
    targetAsset: "/partners/double-sens.webp",
    note: "Official brand site confirmed and visibly identifies the Double Sens brand. Discover and vet the master logo before ingestion; do not reuse editorial imagery as a logo source.",
  },
  "destination-aventure": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://destinationaventure.fr/",
    preferredSource: null,
    targetAsset: "/partners/destination-aventure.webp",
    note: "Official site confirmed. Its 2026 contractual documentation identifies DESTINATION AVENTURE / ASA TRAVEL; master logo asset still needs direct vetting before ingestion.",
  },
  "la-francaise-des-circuits": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.lafrancaisedescircuits.fr/",
    preferredSource: null,
    targetAsset: "/partners/la-francaise-des-circuits.webp",
    note: "Official site confirms the brand, describes circuits/autotours across five continents, and identifies it as a brand of AEROSUN VOYAGES / Marietton. Master logo asset still needs direct vetting.",
  },
  "salaun-holidays": {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.salaun-holidays.com/informations/mentions-legales",
    preferredSource: null,
    targetAsset: "/partners/salaun-holidays.webp",
    note: "Official legal notice identifies Salaün Holidays as a protected mark and prohibits reproduction/exploitation without authorisation.",
  },
  nordiska: {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.salaun-holidays.com/nordiska",
    preferredSource: null,
    targetAsset: "/partners/nordiska.webp",
    note: "Official Salaün page confirms Nordiska as its Nordic specialist brand; legal notice restricts reproduction of the protected mark.",
  },
  "pouchkine-tours": {
    status: "permission-review",
    sourceType: "brand-permission",
    sourcePage: "https://www.salaun-holidays.com/informations/brochures-salaun-holidays",
    preferredSource: null,
    targetAsset: "/partners/pouchkine-tours.webp",
    note: "Official Salaün brochures page confirms Pouchkine Tours as a specialist brand; legal notice restricts reproduction of the protected mark.",
  },
  "top-of-travel": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.topoftravel.fr/",
    preferredSource: null,
    targetAsset: "/partners/top-of-travel.webp",
    note: "Official site confirmed and actively presents Top of Travel circuits, stays and Top Clubs with departures across France. Master logo asset still needs direct vetting before ingestion.",
  },
  "visit-europe": {
    status: "source-pending",
    sourceType: "official-brand-source",
    sourcePage: "https://www.visiteurope.fr/",
    preferredSource: null,
    targetAsset: "/partners/visit-europe.webp",
    note: "Official brand site known; master logo asset still needs vetting.",
  },
  "voyages-internationaux": {
    status: "source-pending",
    sourceType: "official-brand-source",
    sourcePage: "https://www.voyages-internationaux.fr/",
    preferredSource: null,
    targetAsset: "/partners/voyages-internationaux.webp",
    note: "Official brand site known; master logo asset still needs vetting.",
  },
  "rev-vacances": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.rev-vacances.fr/",
    preferredSource: null,
    targetAsset: "/partners/rev-vacances.webp",
    note: "Official REV VACANCES site is operated by PACHA TOURS SAS and presents circuits, cruises and tailor-made travel. Vet only the REV VACANCES masterbrand before ingestion.",
  },
  worldia: {
    status: "source-pending",
    sourceType: "official-brand-source",
    sourcePage: "https://www.worldia.com/",
    preferredSource: null,
    targetAsset: "/partners/worldia.webp",
    note: "Official brand site known; master logo asset still needs vetting.",
  },
});

export function getCircuitLogoSource(partnerId) {
  return PARTNER_CIRCUIT_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
