"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_ORIGIN = String(
  process.env.PUBLIC_SITE_ORIGIN ||
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const PUBLISHED_SITES = Object.freeze([
  "ambassade-fram-mondescale-maurepas",
  "ambassade-fram-mondescale-nevers",
  "ambassade-fram-mondescale-dax",
  "ambassade-fram-mondescale-gien",
  "ambassade-fram-mondescale-ozoir-la-ferriere",
  "ambassade-fram-mondescale-bois-colombes",
  "mondescale-lamorlaye",
]);

const BOIS_COLOMBES = "ambassade-fram-mondescale-bois-colombes";

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function sourceContract() {
  const destinationHydrator = read("backend/src/modules/public-site-read/destination-media-hydrator.js");
  const dynamicHydrator = read("backend/src/modules/public-site-read/dynamic-block-hydrator.js");
  const teamHydrator = read("backend/src/modules/public-site-read/team-media-hydrator.js");
  const css = read("frontend/components/public-site/premium-sections.css");
  const local = read("frontend/components/public-site/LocalSeoAreaLinks.js");

  const checks = {
    destinationCollections: /\["destinations",\s*"items"\]/.test(destinationHydrator),
    dynamicMediaPreservation: /mergeDestinationMedia/.test(dynamicHydrator),
    teamAliases: /photoAssetId/.test(teamHydrator) && /avatarAssetId/.test(teamHydrator),
    compactPayment: /public-site-flexible-payment--compact/.test(css),
    compactLocalArea: /public-site-local-area-compact/.test(local),
    defensiveCtaContrast: /public-site-shell \.public-site-cta/.test(css) && /color:\s*#fff/.test(css),
  };

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { checks, failed };
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

async function fetchHtml(slug) {
  const url = `${PUBLIC_ORIGIN}/agence/${encodeURIComponent(slug)}`;
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mondescale-MSE-25.42-readiness/1.0" },
  });
  const html = await response.text();
  return { slug, url, status: response.status, html };
}

function publicSummary(result) {
  const { html } = result;
  return {
    slug: result.slug,
    status: result.status,
    bytes: Buffer.byteLength(html),
    destinationImages: count(html, /public-site-destination-card-image/g),
    teamImages: count(html, /public-site-team-portrait[^>]*>[\s\S]{0,500}?<img\b/g),
    payment: count(html, /public-site-flexible-payment/g),
    compactLocalArea: count(html, /public-site-local-area-compact/g),
  };
}

async function main() {
  const source = sourceContract();
  if (source.failed.length) {
    console.error(JSON.stringify({ ok: false, mode: "source-contract", ...source }, null, 2));
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const slug of PUBLISHED_SITES) {
    results.push(publicSummary(await fetchHtml(slug)));
  }

  const failures = [];
  for (const row of results) {
    if (row.status !== 200) failures.push(`${row.slug}:http-${row.status}`);
    if (!row.payment) failures.push(`${row.slug}:payment-missing`);
    if (!row.compactLocalArea) failures.push(`${row.slug}:compact-local-area-missing`);
  }

  const bois = results.find((row) => row.slug === BOIS_COLOMBES);
  if (!bois?.destinationImages) failures.push("bois-colombes:destination-images-missing");
  if (!bois?.teamImages) failures.push("bois-colombes:team-image-missing");

  console.table(results);
  console.log(JSON.stringify({
    ok: failures.length === 0,
    version: "mse-25.42",
    publicOrigin: PUBLIC_ORIGIN,
    sourceChecks: source.checks,
    failures,
    summary: {
      sites: results.length,
      healthySites: results.filter((row) => row.status === 200).length,
      boisColombesDestinationImages: bois?.destinationImages || 0,
      boisColombesTeamImages: bois?.teamImages || 0,
    },
  }, null, 2));

  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
