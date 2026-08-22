"use strict";

const { getPresenceProvider } = require("./provider-registry");

const LEGACY_DIRECTORY_PROVIDER_KEYS = Object.freeze({
  "Google Business Profile": "google_business_profile",
  "PagesJaunes": "pagesjaunes",
  "Bing Places": "bing_places",
  "Apple Business Connect": "apple_business_connect",
  Facebook: "facebook",
  Foursquare: "foursquare",
  TomTom: "tomtom",
  Mappy: "mappy",
  "118000": "118000"
});

function providerKeyForDirectory(directory) {
  if (!directory) return null;
  if (directory.providerKey && getPresenceProvider(directory.providerKey)) {
    return directory.providerKey;
  }
  return LEGACY_DIRECTORY_PROVIDER_KEYS[directory.name] || null;
}

function enrichDirectoryWithProvider(directory) {
  const providerKey = providerKeyForDirectory(directory);
  const provider = providerKey ? getPresenceProvider(providerKey) : null;
  return {
    ...directory,
    providerKey,
    providerType: provider?.type || null,
    capabilities: provider?.capabilities || [],
    managed: provider?.managed || false,
    requiresApproval: provider?.requiresApproval || false
  };
}

function legacySubmissionModeForProvider(provider) {
  if (!provider) return "manual";
  if (provider.capabilities.includes("push")) return "api";
  if (provider.capabilities.includes("submit")) return "submission_api";
  return "manual";
}

module.exports = {
  LEGACY_DIRECTORY_PROVIDER_KEYS,
  providerKeyForDirectory,
  enrichDirectoryWithProvider,
  legacySubmissionModeForProvider
};