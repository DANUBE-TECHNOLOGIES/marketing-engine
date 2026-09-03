"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  agencySlugFromUrl,
  buildGraph,
  extractHrefValues,
  internalAgencyLinks,
  isIgnoredHref,
  normalizeUrl,
  orphanedSitemapUrls,
  siteRootUrl,
  summarize,
} = require("../scripts/mse-25-85-public-navigation-integrity-gate");

const ORIGIN = "https://agences.mondescale.com";
const ROOT = `${ORIGIN}/agence/site-a`;
const SERVICES = `${ROOT}/services`;
const CONTACT = `${ROOT}/contact`;

function page(url, links = []) {
  return {
    url,
    status: 200,
    finalUrl: url,
    redirected: false,
    html: `<html><body>${links.map((href) => `<a href="${href}">x</a>`).join("")}</body></html>`,
  };
}

test("MSE-25.85 normalizes internal URLs while removing fragments and trailing slash", () => {
  assert.equal(normalizeUrl(`${SERVICES}/#top`), SERVICES);
  assert.equal(normalizeUrl("/agence/site-a/contact#form", ROOT), CONTACT);
  assert.equal(agencySlugFromUrl(SERVICES), "site-a");
  assert.equal(siteRootUrl(SERVICES), ROOT);
});

test("MSE-25.85 extracts rendered anchors but ignores non-navigation href schemes", () => {
  const html = `
    <a href="/agence/site-a/services">Services</a>
    <a href='/agence/site-a/contact'>Contact</a>
    <a href=mailto:test@example.com>Email</a>
    <a href="#top">Top</a>
  `;
  assert.deepEqual(extractHrefValues(html), [
    "/agence/site-a/services",
    "/agence/site-a/contact",
    "mailto:test@example.com",
    "#top",
  ]);
  assert.equal(isIgnoredHref("mailto:test@example.com"), true);
  assert.equal(isIgnoredHref("tel:+33123456789"), true);
  assert.equal(isIgnoredHref("#top"), true);
  assert.equal(isIgnoredHref("/agence/site-a/services"), false);
});

test("MSE-25.85 keeps only same-origin agency navigation links", () => {
  const html = `
    <a href="/agence/site-a/services">Services</a>
    <a href="https://agences.mondescale.com/agence/site-a/contact">Contact</a>
    <a href="https://www.google.com/">Google</a>
    <a href="/robots.txt">Robots</a>
  `;
  assert.deepEqual(internalAgencyLinks(html, ROOT), [SERVICES, CONTACT]);
});

test("MSE-25.85 builds incoming link graph and rejects cross-agency or legacy Lamorlaye links", () => {
  const legacy = `${ORIGIN}/agence/ambassade-fram-mondescale-lamorlaye/contact`;
  const other = `${ORIGIN}/agence/site-b/contact`;
  const graph = buildGraph([
    page(ROOT, [SERVICES, CONTACT, legacy, other]),
    page(SERVICES, [CONTACT]),
    page(CONTACT, [ROOT]),
  ]);

  assert.equal(graph.incoming.get(CONTACT).has(ROOT), true);
  assert.equal(graph.incoming.get(CONTACT).has(SERVICES), true);
  assert.equal(graph.crossAgency.length, 2);
  assert.equal(graph.legacyLinks.length, 1);
});

test("MSE-25.85 identifies sitemap pages with no rendered incoming navigation link", () => {
  const sitemap = [ROOT, SERVICES, CONTACT];
  const graph = buildGraph([
    page(ROOT, [SERVICES]),
    page(SERVICES, [ROOT]),
    page(CONTACT, [ROOT]),
  ]);
  assert.deepEqual(orphanedSitemapUrls(sitemap, graph), [CONTACT]);
});

test("MSE-25.85 certifies a healthy runtime graph without requiring every internal target in sitemap", () => {
  const legal = `${ROOT}/mentions-legales`;
  const sitemap = [ROOT, SERVICES, CONTACT];
  const pages = [
    page(ROOT, [SERVICES, CONTACT, legal]),
    page(SERVICES, [ROOT, CONTACT]),
    page(CONTACT, [ROOT, SERVICES]),
  ];
  const graph = buildGraph(pages);
  const targets = [...new Set(graph.edges.map((edge) => edge.target))];
  const targetResults = targets.map((url) => ({ url, status: 200, finalUrl: url, ok: true }));
  const summary = summarize({ sitemap, pages, graph, targetResults });

  assert.equal(summary.ok, true);
  assert.deepEqual(summary.orphans, []);
  assert.deepEqual(summary.brokenTargets, []);
  assert.deepEqual(summary.crossAgency, []);
  assert.deepEqual(summary.legacyLinks, []);
  assert.deepEqual(summary.offSitemapTargets, [legal]);
});

test("MSE-25.85 fails closed on broken runtime navigation targets", () => {
  const sitemap = [ROOT, SERVICES];
  const pages = [page(ROOT, [SERVICES]), page(SERVICES, [ROOT])];
  const graph = buildGraph(pages);
  const summary = summarize({
    sitemap,
    pages,
    graph,
    targetResults: [
      { url: ROOT, status: 200, finalUrl: ROOT, ok: true },
      { url: SERVICES, status: 404, finalUrl: SERVICES, ok: false },
    ],
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.brokenTargets.length, 1);
  assert.equal(summary.brokenTargets[0].status, 404);
});
