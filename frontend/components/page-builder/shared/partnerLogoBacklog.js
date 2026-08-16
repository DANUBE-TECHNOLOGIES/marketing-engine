"use strict";

export const PARTNER_LOGO_BACKLOG = Object.freeze([
  {
    id: "catlante-catamarans",
    category: "croisieres",
    priority: 1,
    state: "source-pending",
    sourceType: "official-site",
  },
  {
    id: "croisieurope",
    category: "croisieres",
    priority: 1,
    state: "source-pending",
    sourceType: "official-site",
  },
  {
    id: "ponant",
    category: "croisieres",
    priority: 1,
    state: "permission-required",
    sourceType: "official-press-request",
    note: "Le site presse PONANT demande de contacter le service presse pour les logos et visuels.",
  },
  {
    id: "celestyal-cruises",
    category: "croisieres",
    priority: 1,
    state: "permission-required",
    sourceType: "brand-permission",
    note: "Les conditions d'utilisation Celestyal réservent l'utilisation des logos et marques sans consentement exprès.",
  },
  {
    id: "explora-journeys",
    category: "croisieres",
    priority: 1,
    state: "source-pending",
    sourceType: "official-site",
  },
  {
    id: "cfc",
    category: "croisieres",
    priority: 1,
    state: "source-pending",
    sourceType: "official-site",
  },
  {
    id: "hurtigruten",
    category: "croisieres",
    priority: 1,
    state: "source-pending",
    sourceType: "official-site",
  },
]);

export function getPartnerLogoBacklog(category = "") {
  const normalized = String(category || "").trim();
  return PARTNER_LOGO_BACKLOG
    .filter((item) => !normalized || item.category === normalized)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}
