"use strict";

const { getPresenceProvider } = require("./provider-registry");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");

const PROVIDER_DOMAINS = Object.freeze({
  pagesjaunes: ["pagesjaunes.fr"],
  mappy: ["mappy.com", "fr.mappy.com"],
  tripadvisor: ["tripadvisor.fr", "tripadvisor.com"],
  petit_fute: ["petitfute.com"],
  "118000": ["118000.fr"],
  foursquare: ["foursquare.com"],
  facebook: ["facebook.com"],
  bing_places: ["bing.com", "bingplaces.com"],
  here: ["here.com", "wego.here.com"],
  tomtom: ["tomtom.com"]
});

function quote(value) {
  return `"${String(value || "").replace(/"/g, "").trim()}"`;
}

function buildDiscoveryQueries(agency, providerKey) {
  const provider = getPresenceProvider(providerKey);
  if (!provider) throw new Error(`Unknown Presence provider: ${providerKey}`);
  const domains = PROVIDER_DOMAINS[providerKey] || [];
  if (!domains.length) return Object.freeze([]);

  const canonical = buildCanonicalAgencyIdentity(agency);
  const site = domains.map((domain) => `site:${domain}`).join(" OR ");
  const name = quote(canonical.name);
  const city = quote(canonical.address.city);
  const postalCode = quote(canonical.address.postalCode);
  const phone = canonical.phone ? quote(canonical.phone) : null;

  const queries = [
    `(${site}) ${name} ${city}`,
    `(${site}) ${name} ${postalCode}`
  ];
  if (phone) queries.push(`(${site}) ${phone}`);

  return Object.freeze([...new Set(queries)]);
}

function normalizeHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function scoreCandidate({ agency, providerKey, url, title = "", description = "" }) {
  const domains = PROVIDER_DOMAINS[providerKey] || [];
  const host = normalizeHostname(url);
  if (!host || !domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return 0;

  const canonical = buildCanonicalAgencyIdentity(agency);
  const haystack = `${title} ${description} ${url}`.toLowerCase();
  let score = 40;
  const tokens = [canonical.name, canonical.address.city, canonical.address.postalCode]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  for (const token of tokens) if (haystack.includes(token)) score += 20;
  return Math.min(score, 100);
}

function rankDiscoveryCandidates(agency, providerKey, items = []) {
  return items
    .map((item) => ({
      url: item.url || item.link || null,
      title: item.title || null,
      description: item.description || item.snippet || null,
      score: scoreCandidate({
        agency,
        providerKey,
        url: item.url || item.link,
        title: item.title,
        description: item.description || item.snippet
      })
    }))
    .filter((item) => item.url && item.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}

module.exports = {
  PROVIDER_DOMAINS,
  buildDiscoveryQueries,
  rankDiscoveryCandidates,
  scoreCandidate
};
