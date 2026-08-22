"use strict";

const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { diffNap } = require("./nap-diff");
const { getPresenceProvider } = require("./provider-registry");

const PROVIDER_KEY = "google_business_profile";

function googleListingFromAgency(agency) {
  if (!agency?.googleLocationId) return null;
  const canonical = buildCanonicalAgencyIdentity(agency);
  return {
    externalId: agency.googleLocationId,
    listingUrl: agency.googleLocationId,
    name: canonical.name,
    address: canonical.address,
    postalCode: canonical.postalCode,
    city: canonical.city,
    phone: canonical.phone,
    website: canonical.website
  };
}

function projectGooglePresence(agency) {
  const provider = getPresenceProvider(PROVIDER_KEY);
  const canonical = buildCanonicalAgencyIdentity(agency);
  const listing = googleListingFromAgency(agency);
  const diff = listing ? diffNap(canonical, listing) : null;

  return {
    providerKey: PROVIDER_KEY,
    provider,
    connected: Boolean(listing),
    externalId: listing?.externalId || null,
    listingUrl: listing?.listingUrl || null,
    status: !listing ? "connection_required" : diff?.inSync ? "in_sync" : "drift_detected",
    diff
  };
}

module.exports = {
  PROVIDER_KEY,
  googleListingFromAgency,
  projectGooglePresence
};