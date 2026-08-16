"use strict";

const REVIEW_REQUIRED = Object.freeze({
  "pouchkine-tours": {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  "hotels-lagons": {
    status: "identity-review",
    reason: "Brand identity and official source still need confirmation before final publication.",
  },
  "lmx-voyages": {
    status: "identity-review",
    reason: "Brand identity and official source still need confirmation before final publication.",
  },
  "mega-vacances": {
    status: "identity-review",
    reason: "Brand identity and official source still need confirmation before final publication.",
  },
  aerosun: {
    status: "identity-review",
    reason: "Commercial identity and relationship with Voyamar still need confirmation before final publication.",
  },
  amerigo: {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  asiam: {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  "gaeland-ashling": {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  "planete-production": {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  "travel-evasion": {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
  "rev-vacances": {
    status: "identity-review",
    reason: "Official brand identity/source still needs confirmation before final publication.",
  },
});

const ASSET_RESTRICTIONS = Object.freeze({
  ponant: {
    status: "asset-permission-review",
    reason: "Partner identity is known, but logo/press asset use requires a controlled source or permission.",
  },
  "celestyal-cruises": {
    status: "asset-permission-review",
    reason: "Partner identity is known, but logo use requires permission review.",
  },
});

export function getPartnerVerification(partnerId) {
  const id = String(partnerId || "").trim();
  if (REVIEW_REQUIRED[id]) return REVIEW_REQUIRED[id];
  if (ASSET_RESTRICTIONS[id]) return ASSET_RESTRICTIONS[id];
  return { status: "confirmed", reason: "Partner identity accepted for catalogue publication." };
}

export function isPartnerPublicationConfirmed(partnerId) {
  return getPartnerVerification(partnerId).status !== "identity-review";
}

export function getPartnerVerificationSummary(partners = []) {
  return partners.reduce(
    (summary, partner) => {
      const status = getPartnerVerification(partner?.id).status;
      summary.total += 1;
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    { total: 0, confirmed: 0, "identity-review": 0, "asset-permission-review": 0 }
  );
}
