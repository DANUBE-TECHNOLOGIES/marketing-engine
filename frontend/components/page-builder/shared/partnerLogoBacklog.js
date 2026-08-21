"use strict";

// Active logo backlog only. Partners with a user-supplied or otherwise accepted
// public asset are intentionally removed from this queue.
export const PARTNER_LOGO_BACKLOG = Object.freeze([
  { id: "explora-journeys", category: "croisieres", priority: 1, state: "source-pending", sourceType: "official-press-kit", note: "Use the official Explora Journeys Media Centre / Press Kit rather than favicon or UI assets." },
  { id: "lmx-voyages", category: "sejours", priority: 3, state: "source-pending", sourceType: "official-site" },
  { id: "voyamar", category: "sejours", priority: 3, state: "permission-required", sourceType: "brand-permission", note: "Hold until an authorised asset or explicit permission is available." },
  { id: "asiam", category: "sur-mesure", priority: 4, state: "verification-pending", sourceType: "identity-review", note: "Resolve brand identity before public asset ingestion." },
]);
