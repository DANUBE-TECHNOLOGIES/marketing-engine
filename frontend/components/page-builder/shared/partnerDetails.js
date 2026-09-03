"use strict";

// Transitional compatibility hook. All confirmed partner editorial profiles now
// live in category-specific detail modules. Keep this resolver temporarily so
// older imports remain safe while the rest of the application migrates.
const DETAILS = Object.freeze({});

export function getPartnerDetails(partnerId) {
  return DETAILS[String(partnerId || "")] || null;
}
