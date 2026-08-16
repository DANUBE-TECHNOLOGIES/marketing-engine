"use strict";

export const PARTNER_LOGO_BACKLOG = Object.freeze([
  { id: "catlante-catamarans", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site" },
  { id: "croisieurope", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site" },
  { id: "ponant", category: "croisieres", priority: 1, state: "permission-required", sourceType: "official-press-request", note: "Le site presse PONANT demande de contacter le service presse pour les logos et visuels." },
  { id: "celestyal-cruises", category: "croisieres", priority: 1, state: "permission-required", sourceType: "brand-permission", note: "Les conditions d'utilisation Celestyal réservent l'utilisation des logos et marques sans consentement exprès." },
  { id: "explora-journeys", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site" },
  { id: "cfc", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site" },
  { id: "hurtigruten", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-site" },

  { id: "destination-aventure", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "la-francaise-des-circuits", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "salaun-holidays", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "nordiska", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "top-of-travel", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "visit-europe", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "voyages-internationaux", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "worldia", category: "circuits", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "pouchkine-tours", category: "circuits", priority: 3, state: "verification-pending", sourceType: "identity-check", note: "Ne pas intégrer de logo tant que la marque et sa source officielle ne sont pas confirmées." },

  { id: "belambra", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "boomerang", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "hotels-lagons", category: "sejours", priority: 3, state: "verification-pending", sourceType: "identity-check" },
  { id: "lmx-voyages", category: "sejours", priority: 3, state: "verification-pending", sourceType: "identity-check" },
  { id: "mega-vacances", category: "sejours", priority: 3, state: "verification-pending", sourceType: "identity-check" },
  { id: "mondial-tourisme", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "plein-vent", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "solea", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "pacha-tours", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "heliades", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "voyamar", category: "sejours", priority: 2, state: "source-pending", sourceType: "official-site" },
  { id: "aerosun", category: "sejours", priority: 3, state: "verification-pending", sourceType: "identity-check" },
]);

export function getPartnerLogoBacklog(category = "") {
  const normalized = String(category || "").trim();
  return PARTNER_LOGO_BACKLOG
    .filter((item) => !normalized || item.category === normalized)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}
