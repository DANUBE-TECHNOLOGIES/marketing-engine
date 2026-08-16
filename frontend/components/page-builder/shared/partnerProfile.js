"use strict";

import { getPartnerDetails } from "./partnerDetails";
import { getCruisePartnerDetails } from "./partnerCruiseDetails";
import { getCircuitPartnerDetails } from "./partnerCircuitDetails";
import { getStayPartnerDetails } from "./partnerStayDetails";
import { getLongHaulPartnerDetails } from "./partnerLongHaulDetails";
import { getFranceEuropePartnerDetails } from "./partnerFranceEuropeDetails";
import { getPartnerVerification } from "./partnerVerification";

const DETAIL_GETTERS = Object.freeze([
  getPartnerDetails,
  getCruisePartnerDetails,
  getCircuitPartnerDetails,
  getStayPartnerDetails,
  getLongHaulPartnerDetails,
  getFranceEuropePartnerDetails,
]);

export function getResolvedPartnerDetails(partnerId) {
  for (const getter of DETAIL_GETTERS) {
    const details = getter(partnerId);
    if (details) return details;
  }
  return null;
}

export function getPartnerProfile(partner) {
  if (!partner || !partner.id) return null;

  const details = getResolvedPartnerDetails(partner.id);
  const verification = getPartnerVerification(partner.id);

  return {
    ...partner,
    details,
    verification,
    publishable: verification.status !== "identity-review",
    hasLogo: Boolean(String(partner.logoUrl || "").trim()),
    hasDetails: Boolean(details),
    visibleTags: Array.isArray(partner.tags) ? partner.tags.slice(0, 2) : [],
  };
}

export function getPublishablePartnerProfiles(partners = []) {
  return partners
    .map(getPartnerProfile)
    .filter((partner) => partner?.publishable);
}
