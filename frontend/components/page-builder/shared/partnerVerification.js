"use strict";

const REVIEW_REQUIRED = Object.freeze({
  asiam: {
    status: "identity-review",
    reason: "A recent ASIAM TRAVEL company exists in France, but there is not yet enough evidence that it is the same commercial brand shown in the partner inventory; publication stays blocked until the identity is matched conclusively.",
  },
});

const CATALOGUE_EXCLUSIONS = Object.freeze({
  worldia: {
    status: "catalogue-excluded",
    reason: "Explicitly excluded from the Mondescale public partner catalogue.",
  },
  aerosun: {
    status: "catalogue-excluded",
    reason: "AEROSUN VOYAGES SAS is the legal operator behind the VOYAMAR public brands; keeping Aerosun as a separate public partner would duplicate Voyamar rather than identify a distinct consumer-facing brand.",
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
  cfc: {
    status: "asset-permission-review",
    reason: "Partner identity is known, but CFC logo reproduction is held until an authorised asset source or written permission is confirmed.",
  },
  "salaun-holidays": {
    status: "asset-permission-review",
    reason: "Partner identity is confirmed, but Salaün Holidays' legal notice prohibits reproduction/exploitation of its protected marks without authorisation.",
  },
  nordiska: {
    status: "asset-permission-review",
    reason: "Partner identity is confirmed, but Nordiska is listed as a protected Salaün mark whose reproduction/exploitation is prohibited without authorisation.",
  },
  "pouchkine-tours": {
    status: "asset-permission-review",
    reason: "Partner identity is confirmed by Salaün Holidays, but Pouchkine Tours is listed as a protected mark whose reproduction/exploitation is prohibited without authorisation.",
  },
  belambra: {
    status: "asset-permission-review",
    reason: "Belambra's official legal notice requires prior written authorisation for reproduction or use of its logos and marks.",
  },
  heliades: {
    status: "asset-permission-review",
    reason: "Héliades' official terms prohibit reproduction of its marks and logos without express authorisation.",
  },
  voyamar: {
    status: "asset-permission-review",
    reason: "Voyamar's official terms prohibit reproduction of its marks and logos without express authorisation.",
  },
});

export function getPartnerVerification(partnerId) {
  const id = String(partnerId || "").trim();
  if (CATALOGUE_EXCLUSIONS[id]) return CATALOGUE_EXCLUSIONS[id];
  if (REVIEW_REQUIRED[id]) return REVIEW_REQUIRED[id];
  if (ASSET_RESTRICTIONS[id]) return ASSET_RESTRICTIONS[id];
  return { status: "confirmed", reason: "Partner identity accepted for catalogue publication." };
}

export function isPartnerPublicationConfirmed(partnerId) {
  const status = getPartnerVerification(partnerId).status;
  return status !== "identity-review" && status !== "catalogue-excluded";
}

export function getPartnerVerificationSummary(partners = []) {
  return partners.reduce(
    (summary, partner) => {
      const status = getPartnerVerification(partner?.id).status;
      summary.total += 1;
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    { total: 0, confirmed: 0, "identity-review": 0, "asset-permission-review": 0, "catalogue-excluded": 0 }
  );
}
