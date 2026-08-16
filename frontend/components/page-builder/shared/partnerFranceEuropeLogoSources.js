"use strict";

// Controlled source registry for confirmed France / Europe specialists.
// Official websites establish identity only; assetUrl remains empty until the
// exact masterbrand asset is vetted for reproduction and public use.
export const PARTNER_FRANCE_EUROPE_LOGO_SOURCES = Object.freeze({
  "campings-com": {
    status: "official-source-page",
    sourceUrl: "https://www.campings.com/",
    assetUrl: "",
    note: "Use only the Campings.com masterbrand, not campsite, accommodation or promotional artwork.",
  },
  lagrange: {
    status: "official-source-page",
    sourceUrl: "https://www.vacances-lagrange.com/",
    assetUrl: "",
    note: "Use the Lagrange Vacances masterbrand from an official source.",
  },
  mmv: {
    status: "official-source-page",
    sourceUrl: "https://www.mmv.fr/",
    assetUrl: "",
    note: "Use the MMV Vacances Club masterbrand; do not substitute a residence or destination identity.",
  },
  "pierre-vacances-center-parcs": {
    status: "multi-brand-review",
    sourceUrl: "https://www.pierreetvacances.com/",
    assetUrl: "",
    brands: Object.freeze({
      "pierre-vacances": {
        name: "Pierre & Vacances",
        sourceUrl: "https://www.pierreetvacances.com/",
        assetUrl: "",
        status: "source-pending",
      },
      "center-parcs": {
        name: "Center Parcs",
        sourceUrl: "https://www.centerparcs.fr/",
        assetUrl: "",
        status: "source-pending",
      },
      maeva: {
        name: "maeva",
        sourceUrl: "https://www.maeva.com/",
        assetUrl: "",
        status: "source-pending",
      },
    }),
    note: "Public catalogue keeps one compact group entry, but each of the three brands must retain its own vetted logo asset. Never use one brand logo as a proxy for the other two.",
  },
  ollandini: {
    status: "official-source-page",
    sourceUrl: "https://www.ollandini.fr/",
    assetUrl: "",
    note: "Corsica specialist. Use only the Ollandini Voyages masterbrand from a vetted official source.",
  },
  odalys: {
    status: "official-source-page",
    sourceUrl: "https://www.odalys-vacances.com/",
    assetUrl: "",
    note: "Use the Odalys Vacances/Voyages identity that corresponds to the public partner catalogue entry.",
  },
  "thalasso-n1": {
    status: "official-source-page",
    sourceUrl: "https://www.thalassonumero1.com/",
    assetUrl: "",
    note: "Use only the Thalasso N°1 masterbrand from an official source.",
  },
  "villages-clubs-soleil": {
    status: "official-source-page",
    sourceUrl: "https://www.villagesclubsdusoleil.com/",
    assetUrl: "",
    note: "Use only the Villages Clubs du Soleil masterbrand from an official source.",
  },
});

export function getFranceEuropeLogoSource(partnerId) {
  return PARTNER_FRANCE_EUROPE_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
