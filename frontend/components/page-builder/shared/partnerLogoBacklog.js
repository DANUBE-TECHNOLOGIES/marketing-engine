"use strict";

export const PARTNER_LOGO_BACKLOG = Object.freeze([
  { id: "catlante-catamarans", category: "croisieres", priority: 1, state: "source-vetted", sourceType: "official-site-svg", note: "Official site exposes logo.svg and logo-scroll.svg; use a vetted source before normalisation." },
  { id: "croisieurope", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site-or-brand-kit", note: "No trustworthy logo asset was exposed by the public homepage discovery pass." },
  { id: "rivages-du-monde", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site", note: "Official Rivages du Monde site confirmed; discover and vet only the masterbrand logo, never ship or itinerary artwork." },
  { id: "ponant", category: "croisieres", priority: 1, state: "permission-required", sourceType: "official-press-request", note: "Le site presse PONANT demande de contacter le service presse pour les logos et visuels." },
  { id: "celestyal-cruises", category: "croisieres", priority: 1, state: "permission-required", sourceType: "brand-permission", note: "Les conditions d'utilisation Celestyal réservent l'utilisation des logos et marques sans consentement exprès." },
  { id: "explora-journeys", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-press-kit", note: "Use the official Explora Journeys Media Centre / Press Kit rather than favicon or UI assets." },
  { id: "cfc", category: "croisieres", priority: 1, state: "permission-required", sourceType: "brand-permission", note: "Hold logo reproduction until an authorised source or explicit permission is confirmed." },
  { id: "hurtigruten", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-press-library", note: "Homepage candidates are sub-brand wordmarks; use the official Hurtigruten press/media library for the masterbrand asset." },

  { id: "double-sens", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "destination-aventure", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "la-francaise-des-circuits", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "salaun-holidays", category: "circuits", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Salaün Holidays legal notice prohibits reproduction/exploitation of its protected marks without authorisation." },
  { id: "nordiska", category: "circuits", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Nordiska is explicitly listed as a protected Salaün mark; hold logo use until authorisation." },
  { id: "top-of-travel", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "visit-europe", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "voyages-internationaux", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "rev-vacances", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site", note: "Official Rev Vacances site confirmed; use only the REV VACANCES masterbrand from a vetted source." },
  { id: "pouchkine-tours", category: "circuits", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Pouchkine Tours identity is confirmed by Salaün Holidays, but the mark is protected and logo reproduction is held until authorisation." },

  { id: "belambra", category: "sejours", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Belambra legal notice requires prior written authorisation for use or reproduction of logos and marks." },
  { id: "boomerang", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "jet-tours", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site", note: "Use only the Jet tours masterbrand from an official source; do not substitute Club Jet tours or another sub-brand." },
  { id: "hotels-lagons", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site", note: "Official Hôtels & Lagons B2B site confirmed; use only the masterbrand." },
  { id: "lmx-voyages", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site", note: "Official French LMX Voyages site confirmed; use the French-market masterbrand." },
  { id: "mondial-tourisme", category: "sejours", priority: 2, state: "permission-required", sourceType: "site-terms-restriction", note: "Mondial Tourisme's official site terms prohibit reuse/exploitation of site elements; hold logo ingestion pending an authorised brand asset or explicit permission." },
  { id: "plein-vent", category: "sejours", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Plein Vent's official legal notice requires express authorisation from the rights holder for reproduction or representation of its marks and logos." },
  { id: "solea", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "pacha-tours", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "heliades", category: "sejours", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Héliades terms prohibit reproduction of marks and logos without express authorisation." },
  { id: "voyamar", category: "sejours", priority: 2, state: "permission-required", sourceType: "brand-permission", note: "Voyamar terms prohibit reproduction of marks and logos without express authorisation." },
  { id: "travel-evasion", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site", note: "Official Travel Evasion public and B2B sites confirmed; use only the Travel Evasion masterbrand, not Mon French Club or product artwork." },

  { id: "alma-latina", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "australie-tours", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "amerigo", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "beachcomber-tours", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "climats-du-monde", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "asia", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "asiam", category: "sur-mesure", priority: 3, state: "verification-pending", sourceType: "identity-check" },
  { id: "austral-lagons", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "jetset-voyages", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "luxair-tours", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "gaeland-ashling", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "planete-production", category: "sur-mesure", priority: 2, state: "source-pending", sourceType: "official-site" },

  { id: "campings-com", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "lagrange", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "mmv", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "pierre-vacances-center-parcs", category: "france-europe", priority: 2, state: "source-pending", sourceType: "brand-cluster", note: "Three-brand cluster: Pierre & Vacances, Center Parcs and maeva require separate vetted masterbrand assets." },
  { id: "ollandini", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site", note: "Corsica specialist; source only the Ollandini masterbrand from its official site." },
  { id: "odalys", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "thalasso-n1", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "villages-clubs-soleil", category: "france-europe", priority: 2, state: "source-pending", sourceType: "official-site" },
]);

export function getPartnerLogoBacklog(category = "") {
  const normalized = String(category || "").trim();
  return PARTNER_LOGO_BACKLOG
    .filter((item) => !normalized || item.category === normalized)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}
