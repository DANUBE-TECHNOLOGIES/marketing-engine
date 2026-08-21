"use strict";

// Controlled source registry for confirmed long-haul / tailor-made partners.
export const PARTNER_LONG_HAUL_LOGO_SOURCES = Object.freeze({
  "alma-latina": { status: "official-source-page", sourceUrl: "https://www.almalatinatours.com/", assetUrl: "", note: "Official Alma Latina site confirmed; source only the Alma Latina masterbrand, not destination or brochure artwork." },
  "australie-tours": { status: "official-source-page", sourceUrl: "https://www.australietours.com/", assetUrl: "", note: "Official Australie Tours site confirmed; retain only the masterbrand identity." },
  amerigo: { status: "official-source-page", sourceUrl: "https://www.amerigo.fr/", assetUrl: "", note: "Official Amérigo specialist tour-operator site confirmed; use only its masterbrand identity." },
  "beachcomber-tours": { status: "official-source-page", sourceUrl: "https://www.beachcombertours.fr/", assetUrl: "", note: "Use the Beachcomber Tours tour-operator masterbrand, not an individual Beachcomber Resorts hotel mark." },
  "climats-du-monde": { status: "official-source-page", sourceUrl: "https://www.climatsdumonde.fr/", assetUrl: "", note: "Official Climats du Monde tour-operator site confirmed; masterbrand asset still requires vetting." },
  asia: { status: "official-source-page", sourceUrl: "https://www.asia.fr/", assetUrl: "", note: "Official Asia tour-operator source; avoid generic ASIA wordmarks from unrelated brands." },
  "austral-lagons": { status: "official-source-page", sourceUrl: "https://www.australlagons.com/", assetUrl: "", note: "Official Austral Lagons source; masterbrand asset still requires vetting." },
  "jetset-voyages": { status: "official-source-page", sourceUrl: "https://www.jetset-voyages.fr/", assetUrl: "", note: "Official JetSet Voyages source; use only the tour-operator masterbrand." },
  "luxair-tours": { status: "official-source-page", sourceUrl: "https://www.luxairtours.lu/", assetUrl: "", note: "Official LuxairTours source; do not substitute the Luxair airline-only mark for the tour-operator identity." },
  "gaeland-ashling": { status: "official-source-page", sourceUrl: "https://www.gaeland-ashling.com/", assetUrl: "", note: "Official Gaeland Ashling source confirmed; use only the Celtic-destinations specialist masterbrand." },
});

export function getLongHaulLogoSource(partnerId) {
  return PARTNER_LONG_HAUL_LOGO_SOURCES[String(partnerId || "").trim()] || null;
}
