"use strict";

const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { compareNap } = require("./nap-diff");
const { getPresenceProvider } = require("./provider-registry");
const { readGoogleLocation } = require("./google-business-information");

const PROVIDER_KEY = "google_business_profile";

async function projectGooglePresence(prisma, agency) {
  const provider = getPresenceProvider(PROVIDER_KEY);
  const canonical = buildCanonicalAgencyIdentity(agency);

  if (!agency?.googleLocationId) {
    return {
      providerKey: PROVIDER_KEY,
      provider,
      connected: false,
      externalId: null,
      listingUrl: null,
      status: "connection_required",
      diff: null
    };
  }

  const remote = await readGoogleLocation(prisma, agency.googleLocationId);
  const diff = compareNap(canonical, remote.nap);

  return {
    providerKey: PROVIDER_KEY,
    provider,
    connected: true,
    externalId: remote.nap.externalId || agency.googleLocationId,
    listingUrl: remote.nap.externalId || agency.googleLocationId,
    status: diff.match ? "in_sync" : "drift_detected",
    diff
  };
}

module.exports = {
  PROVIDER_KEY,
  projectGooglePresence
};