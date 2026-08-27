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
  HERE: "here",
  Mappy: "mappy",
  Tripadvisor: "tripadvisor",
  "Petit Futé": "petit_fute",
  "118000": "118000"
});

const LEGACY_DIRECTORY_NAMES_BY_PROVIDER = Object.freeze(
  Object.fromEntries(
    Object.entries(LEGACY_DIRECTORY_PROVIDER_KEYS).map(([name, providerKey]) => [providerKey, name])
  )
);

function providerKeyForDirectory(directory) {
  if (!directory) return null;
  if (directory.providerKey && getPresenceProvider(directory.providerKey)) {
    return directory.providerKey;
  }
  return LEGACY_DIRECTORY_PROVIDER_KEYS[directory.name] || null;
}

function directoryNameForProviderKey(providerKey) {
  return LEGACY_DIRECTORY_NAMES_BY_PROVIDER[providerKey] || null;
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
  LEGACY_DIRECTORY_NAMES_BY_PROVIDER,
  providerKeyForDirectory,
  directoryNameForProviderKey,
  enrichDirectoryWithProvider,
  legacySubmissionModeForProvider
};
