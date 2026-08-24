"use strict";

const {
  PRESENCE_PROVIDER_TYPES,
  PRESENCE_CAPABILITIES,
  createPresenceProviderDefinition
} = require("./presence-provider");

const C = PRESENCE_CAPABILITIES;
const T = PRESENCE_PROVIDER_TYPES;

const PROVIDERS = Object.freeze([
  createPresenceProviderDefinition({
    key: "google_business_profile",
    name: "Google Business Profile",
    type: T.MANAGED_API,
    managed: true,
    capabilities: [C.DISCOVER, C.READ, C.CONNECT, C.PUSH, C.VERIFY, C.MEDIA, C.HOURS, C.CATEGORIES],
    notes: "Existing Local Engine integration; migrate behind this contract without changing behavior."
  }),
  createPresenceProviderDefinition({
    key: "apple_business_connect",
    name: "Apple Business Connect",
    type: T.MANAGED_API,
    managed: true,
    requiresApproval: true,
    capabilities: [C.READ, C.CONNECT, C.PUSH, C.VERIFY, C.MEDIA, C.HOURS, C.CATEGORIES]
  }),
  createPresenceProviderDefinition({
    key: "facebook",
    name: "Facebook",
    type: T.MANAGED_API,
    managed: true,
    capabilities: [C.READ, C.CONNECT, C.PUSH, C.VERIFY, C.HOURS, C.CATEGORIES]
  }),
  createPresenceProviderDefinition({
    key: "here",
    name: "HERE",
    type: T.CONTRIBUTION_API,
    capabilities: [C.DISCOVER, C.READ, C.SUBMIT, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "tomtom",
    name: "TomTom",
    type: T.CONTRIBUTION_API,
    capabilities: [C.DISCOVER, C.READ, C.SUBMIT, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "foursquare",
    name: "Foursquare",
    type: T.CONTRIBUTION_API,
    capabilities: [C.DISCOVER, C.READ, C.SUBMIT, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "bing_places",
    name: "Bing Places",
    type: T.MANAGED_PORTAL,
    capabilities: [C.DISCOVER, C.VERIFY],
    notes: "Keep portal-managed until a supported write API is confirmed."
  }),
  createPresenceProviderDefinition({
    key: "pagesjaunes",
    name: "PagesJaunes",
    type: T.MANAGED_PORTAL,
    capabilities: [C.DISCOVER, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "mappy",
    name: "Mappy",
    type: T.MONITORED_CITATION,
    capabilities: [C.DISCOVER, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "tripadvisor",
    name: "Tripadvisor",
    type: T.MANAGED_PORTAL,
    capabilities: [C.DISCOVER, C.READ, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "petit_fute",
    name: "Petit Futé",
    type: T.MONITORED_CITATION,
    capabilities: [C.DISCOVER, C.VERIFY]
  }),
  createPresenceProviderDefinition({
    key: "118000",
    name: "118000",
    type: T.MONITORED_CITATION,
    capabilities: [C.DISCOVER, C.VERIFY]
  })
]);

const PROVIDERS_BY_KEY = new Map(PROVIDERS.map((provider) => [provider.key, provider]));

function listPresenceProviders() {
  return PROVIDERS;
}

function getPresenceProvider(key) {
  return PROVIDERS_BY_KEY.get(key) || null;
}

module.exports = {
  listPresenceProviders,
  getPresenceProvider
};
