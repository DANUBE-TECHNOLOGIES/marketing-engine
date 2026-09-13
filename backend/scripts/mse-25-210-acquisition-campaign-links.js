"use strict";

const { NETWORK_AGENCIES } = require("../src/modules/acquisition-funnel");

const ORIGIN = (process.env.ACQUISITION_PUBLIC_ORIGIN || "https://agences.mondescale.com").replace(/\/$/, "");
const CAMPAIGN = "soleil-hiver";
const CHANNELS = Object.freeze([
  Object.freeze({ key: "email", source: "iga", medium: "email", content: "quiz-soleil-hiver" }),
  Object.freeze({ key: "facebook", source: "facebook", medium: "organic-social", content: "post-quiz-soleil-hiver" }),
  Object.freeze({ key: "instagram", source: "instagram", medium: "organic-social", content: "post-quiz-soleil-hiver" }),
  Object.freeze({ key: "google-business", source: "google", medium: "organic-local", content: "business-profile-quiz" }),
  Object.freeze({ key: "qr-agence", source: "agency", medium: "qr", content: "in-store-quiz" }),
]);

function buildCampaignUrl(agency, channel) {
  const url = new URL(`${ORIGIN}/acquisition/${agency.publicSiteSlug}/${CAMPAIGN}`);
  url.searchParams.set("utm_source", channel.source);
  url.searchParams.set("utm_medium", channel.medium);
  url.searchParams.set("utm_campaign", `${CAMPAIGN}-2026-2027`);
  url.searchParams.set("utm_content", `${agency.publicSiteSlug}-${channel.content}`);
  return url.toString();
}

function buildMatrix() {
  return NETWORK_AGENCIES.map((agency) => ({
    agency: agency.agencyCity,
    publicSiteSlug: agency.publicSiteSlug,
    siteSlug: agency.siteSlug,
    campaign: CAMPAIGN,
    links: Object.fromEntries(CHANNELS.map((channel) => [channel.key, buildCampaignUrl(agency, channel)])),
  }));
}

if (require.main === module) {
  const matrix = buildMatrix();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify({ campaign: CAMPAIGN, generatedAt: new Date().toISOString(), agencies: matrix }, null, 2)}\n`);
  } else {
    console.log("MSE-25.210 — ACQUISITION CAMPAIGN LINKS");
    for (const row of matrix) {
      console.log(`\n${row.agency} (${row.publicSiteSlug})`);
      for (const [channel, url] of Object.entries(row.links)) console.log(`  ${channel.padEnd(15)} ${url}`);
    }
  }
}

module.exports = { CAMPAIGN, CHANNELS, buildCampaignUrl, buildMatrix };
