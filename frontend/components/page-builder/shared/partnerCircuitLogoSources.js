"use strict";

export const PARTNER_CIRCUIT_LOGO_SOURCES = Object.freeze({
  "double-sens": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.doublesens.fr/",
    preferredSource: null,
    targetAsset: "/partners/double-sens.webp",
    note: "Official brand site confirmed. Discover and vet the master logo before ingestion; do not reuse press article imagery as the logo source.",
  },
  "destination-aventure": {
    status: "source-pending",
    sourceType: "official-brand-source",
    sourcePage: "https://destinationaventure.fr/",
    preferredSource: null,
    targetAsset: "/partners/destination-aventure.webp",
    note: "Official site is known; master logo asset still needs vetting.",
  },
  "la-francaise-des-circuits": {
    status: "official-source-page",
    sourceType: "official-site",
    sourcePage: "https://www.lafrancaisedescircuits.fr/",
    preferredSource: null,
    targetAsset: "/partners/la-francaise-des-circuits.webp",
    note: "Official site confirms the brand and its AEROSUN VOYAGES / Marietton ownership. Master logo asset still needs vetting.",
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
    status: "source-pending",
    sourceType: "official-brand-source",
    sourcePage: "https://www.topoftravel.fr/",
    preferredSource: null,
    targetAsset: "/partners/top-of-travel.webp",
    note: "Official brand site known; master logo asset still needs vetting.",
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
