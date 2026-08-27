"use strict";

const { directoryNameForProviderKey } = require("./directory-bridge");

const DIRECTORY_DEFAULTS = Object.freeze({
  google_business_profile: Object.freeze({ website: "https://business.google.com/", category: "map", impactScore: 10, difficulty: 1, priority: 100, submissionMode: "api" }),
  apple_business_connect: Object.freeze({ website: "https://businessconnect.apple.com/", category: "map", impactScore: 9, difficulty: 4, priority: 95, submissionMode: "api" }),
  facebook: Object.freeze({ website: "https://www.facebook.com/", category: "social", impactScore: 8, difficulty: 3, priority: 85, submissionMode: "api" }),
  here: Object.freeze({ website: "https://www.here.com/", category: "map", impactScore: 7, difficulty: 3, priority: 70, submissionMode: "submission_api" }),
  tomtom: Object.freeze({ website: "https://www.tomtom.com/", category: "map", impactScore: 7, difficulty: 4, priority: 68, submissionMode: "submission_api" }),
  foursquare: Object.freeze({ website: "https://foursquare.com/", category: "directory", impactScore: 6, difficulty: 4, priority: 65, submissionMode: "submission_api" }),
  bing_places: Object.freeze({ website: "https://www.bingplaces.com/", category: "map", impactScore: 8, difficulty: 2, priority: 80, submissionMode: "manual" }),
  pagesjaunes: Object.freeze({ website: "https://www.pagesjaunes.fr/", category: "directory", impactScore: 9, difficulty: 2, priority: 90, submissionMode: "manual" }),
  mappy: Object.freeze({ website: "https://fr.mappy.com/", category: "map", impactScore: 7, difficulty: 3, priority: 72, submissionMode: "manual" }),
  tripadvisor: Object.freeze({ website: "https://www.tripadvisor.fr/", category: "directory", impactScore: 7, difficulty: 2, priority: 75, submissionMode: "manual" }),
  petit_fute: Object.freeze({ website: "https://www.petitfute.com/", category: "directory", impactScore: 5, difficulty: 3, priority: 60, submissionMode: "manual" }),
  "118000": Object.freeze({ website: "https://www.118000.fr/", category: "directory", impactScore: 4, difficulty: 3, priority: 50, submissionMode: "manual" })
});

function directoryDefaultsForProvider(providerKey) {
  const name = directoryNameForProviderKey(providerKey);
  const defaults = DIRECTORY_DEFAULTS[providerKey] || null;
  return name && defaults ? Object.freeze({ name, active: true, ...defaults }) : null;
}

module.exports = { DIRECTORY_DEFAULTS, directoryDefaultsForProvider };
