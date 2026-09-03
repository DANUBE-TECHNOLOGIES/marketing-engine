"use strict";

const PUBLIC_ORIGIN = String(process.env.PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com").replace(/\/+$/, "");
const EXPECTED_SITEMAP_COUNT = Number(process.env.MSE_25_87_EXPECTED_SITEMAP_COUNT || 115);
const CONCURRENCY = Math.max(1, Number(process.env.MSE_25_87_CONCURRENCY || 4));
const TIMEOUT_MS = Math.max(1000, Number(process.env.MSE_25_87_TIMEOUT_MS || 20000));

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sitemapUrls(xml) {
  const urls = [];
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  let match;
  while ((match = regex.exec(String(xml || "")))) urls.push(decodeXml(match[1].trim()));
  return urls;
}

function agencyRoot(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] !== "agence" || !parts[1]) return null;
  return `${parsed.origin}/agence/${parts[1]}`;
}

function isAgencyHome(url) {
  const root = agencyRoot(url);
  if (!root) return false;
  return new URL(url).pathname.replace(/\/+$/, "") === new URL(root).pathname;
}

function isDestinationLanding(url) {
  return /\/destination\//.test(new URL(url).pathname);
}

function expectsContextualJourney(url) {
  return Boolean(agencyRoot(url)) && !isAgencyHome(url) && !isDestinationLanding(url);
}

function contextualJourneyHtml(html) {
  const match = String(html || "").match(/<section\b[^>]*data-contextual-journey=["']content["'][^>]*>([\s\S]*?)<\/section>/i);
  return match ? match[0] : null;
}

function hrefs(html) {
  const result = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(String(html || "")))) result.push(match[1]);
  return result;
}

function inspectPage({ url, status, html }) {
  const issues = [];
  const expected = expectsContextualJourney(url);
  const journey = contextualJourneyHtml(html);
  const links = journey ? hrefs(journey) : [];
  const root = agencyRoot(url);

  if (status !== 200) issues.push(`http:${status}`);
  if (expected && !journey) issues.push("contextual-journey-missing");
  if (expected && journey && (links.length < 2 || links.length > 3)) issues.push(`contextual-link-count:${links.length}`);

  if (expected && journey) {
    const absolute = links.map((href) => new URL(href, url).toString().replace(/\/$/, ""));
    if (new Set(absolute).size !== absolute.length) issues.push("duplicate-contextual-links");
    if (absolute.includes(String(url).replace(/\/$/, ""))) issues.push("self-contextual-link");
    if (absolute.some((target) => !target.startsWith(`${root}/`))) issues.push("cross-agency-contextual-link");
  }

  return { url, expected, journeyPresent: Boolean(journey), linkCount: links.length, issues, ok: issues.length === 0 };
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: response.status, html: await response.text() };
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  console.log("================================================");
  console.log("=== MSE-25.87 - CONTEXTUAL JOURNEY GATE =======");
  console.log("================================================");
  console.log(`PUBLIC=${PUBLIC_ORIGIN}`);

  const sitemapResponse = await fetchText(`${PUBLIC_ORIGIN}/sitemap.xml`);
  if (sitemapResponse.status !== 200) throw new Error(`sitemap-http:${sitemapResponse.status}`);
  const urls = sitemapUrls(sitemapResponse.html);
  console.log(`SITEMAP=${urls.length}`);
  if (urls.length !== EXPECTED_SITEMAP_COUNT) throw new Error(`unexpected-sitemap-count:${urls.length}`);

  const results = await mapConcurrent(urls, CONCURRENCY, async (url) => {
    try {
      const response = await fetchText(url);
      return inspectPage({ url, status: response.status, html: response.html });
    } catch (error) {
      return { url, expected: expectsContextualJourney(url), journeyPresent: false, linkCount: 0, ok: false, issues: [`fetch:${error.message}`] };
    }
  });

  const expected = results.filter((result) => result.expected);
  const failures = results.filter((result) => !result.ok);
  const journeyPages = expected.filter((result) => result.journeyPresent);
  const validLinkCounts = expected.filter((result) => result.linkCount >= 2 && result.linkCount <= 3);

  console.log(`CONTEXTUAL_JOURNEY_EXPECTED=${expected.length}`);
  console.log(`CONTEXTUAL_JOURNEY_PRESENT=${journeyPages.length}/${expected.length}`);
  console.log(`CONTEXTUAL_LINK_COUNT_VALID=${validLinkCounts.length}/${expected.length}`);
  console.log("GOOGLE_WRITES=0");
  console.log("CMS_WRITES=0");
  console.log("DATABASE_WRITES=0");
  console.log(`CONTEXTUAL_JOURNEY_FAILURES=${failures.length}`);
  for (const failure of failures.slice(0, 30)) console.log(`${failure.url} :: ${failure.issues.join(",")}`);

  if (failures.length) process.exitCode = 1;
  else console.log("MSE-25.87=PASS");
}

if (require.main === module) main().catch((error) => { console.error(error); process.exit(1); });

module.exports = {
  agencyRoot,
  contextualJourneyHtml,
  expectsContextualJourney,
  hrefs,
  inspectPage,
  isAgencyHome,
  isDestinationLanding,
  sitemapUrls,
};
