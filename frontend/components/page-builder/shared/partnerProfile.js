"use strict";

import { getCruisePartnerDetails } from "./partnerCruiseDetails";
import { getCircuitPartnerDetails } from "./partnerCircuitDetails";
import { getStayPartnerDetails } from "./partnerStayDetails";
import { getLongHaulPartnerDetails } from "./partnerLongHaulDetails";
import { getFranceEuropePartnerDetails } from "./partnerFranceEuropeDetails";
import { getPartnerVerification } from "./partnerVerification";

const DETAIL_GETTERS = Object.freeze([
  getCruisePartnerDetails,
  getCircuitPartnerDetails,
  getStayPartnerDetails,
  getLongHaulPartnerDetails,
  getFranceEuropePartnerDetails,
]);

const COMPLETENESS_WEIGHTS = Object.freeze({
  identity: 30,
  summary: 20,
  tags: 10,
  details: 25,
  logo: 15,
});

export function getResolvedPartnerDetails(partnerId) {
  for (const getter of DETAIL_GETTERS) {
    const details = getter(partnerId);
    if (details) return details;
  }
  return null;
}

function scorePartnerCompleteness(partner, details, verification) {
  const summary = String(partner?.summary || "").trim();
  const tags = Array.isArray(partner?.tags) ? partner.tags.filter(Boolean) : [];
  const destinations = Array.isArray(details?.destinations) ? details.destinations.filter(Boolean) : [];
  const travelTypes = Array.isArray(details?.travelTypes) ? details.travelTypes.filter(Boolean) : [];
  const hasLogo = Boolean(String(partner?.logoUrl || "").trim());
  const identityConfirmed = verification.status !== "identity-review";

  let score = 0;
  if (identityConfirmed) score += COMPLETENESS_WEIGHTS.identity;
  if (summary.length >= 45) score += COMPLETENESS_WEIGHTS.summary;
  if (tags.length >= 2) score += COMPLETENESS_WEIGHTS.tags;
  if (destinations.length >= 2 && travelTypes.length >= 2) score += COMPLETENESS_WEIGHTS.details;
  if (hasLogo) score += COMPLETENESS_WEIGHTS.logo;

  const blockers = [];
  if (!identityConfirmed) blockers.push("identity-review");
  if (!summary) blockers.push("missing-summary");
  if (tags.length < 2) blockers.push("insufficient-tags");
  if (!destinations.length || !travelTypes.length) blockers.push("missing-details");

  return {
    score,
    contentReady: identityConfirmed && summary.length >= 45 && tags.length >= 2 && destinations.length >= 2 && travelTypes.length >= 2,
    assetReady: hasLogo || verification.status === "asset-permission-review",
    blockers,
  };
}

export function getPartnerProfile(partner) {
  if (!partner || !partner.id) return null;

  const details = getResolvedPartnerDetails(partner.id);
  const verification = getPartnerVerification(partner.id);
  const completeness = scorePartnerCompleteness(partner, details, verification);
  const identityConfirmed = verification.status !== "identity-review";

  return {
    ...partner,
    details,
    verification,
    completeness,
    identityConfirmed,
    publishable: identityConfirmed,
    readyForPublication: completeness.contentReady,
    hasLogo: Boolean(String(partner.logoUrl || "").trim()),
    hasDetails: Boolean(details),
    visibleTags: Array.isArray(partner.tags) ? partner.tags.slice(0, 2) : [],
  };
}

export function getPublishablePartnerProfiles(partners = []) {
  return partners
    .map(getPartnerProfile)
    .filter((partner) => partner?.publishable && partner?.readyForPublication);
}

export function getPartnerCompletenessSummary(partners = []) {
  return partners.map(getPartnerProfile).filter(Boolean).reduce(
    (summary, partner) => {
      summary.total += 1;
      if (partner.publishable) summary.publishable += 1;
      if (partner.readyForPublication) summary.contentReady += 1;
      if (partner.hasLogo) summary.withLogo += 1;
      if (partner.completeness.assetReady) summary.assetReady += 1;
      if (!partner.readyForPublication) summary.needsContent += 1;
      summary.scoreTotal += partner.completeness.score;
      return summary;
    },
    { total: 0, publishable: 0, contentReady: 0, withLogo: 0, assetReady: 0, needsContent: 0, scoreTotal: 0 }
  );
}
