"use strict";
const crypto = require("crypto");
const { analyzeMetadata } = require("./metadata");
const { analyzeContent } = require("./content");
const { analyzeLinks } = require("./links");
const { analyzeMedia } = require("./media");
const { analyzeTechnical } = require("./technical");
const { calculate } = require("../score/calculator");

function analyzePage(page) {
  const metadata = analyzeMetadata(page);
  const content = analyzeContent(page);
  const links = analyzeLinks(page);
  const media = analyzeMedia(page);
  const technical = analyzeTechnical(page);
  const checks = [...metadata.checks, ...content.checks, ...links.checks, ...media.checks, ...technical.checks];
  const scoring = calculate(checks);
  const recommendations = checks.filter(check => !check.passed).sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.weight - a.weight).map(check => ({ id: check.id, severity: check.severity, category: check.category, recommendation: check.recommendation, impact: check.weight, details: check.details }));
  const reportId = crypto.createHash("sha256").update(`${page.id}:${page.updatedAt || ""}:${JSON.stringify(checks)}`).digest("hex").slice(0, 24);
  return { reportId, page: { id: page.id, siteId: page.siteId, title: page.title, slug: page.slug, path: page.path, status: page.status }, ...scoring, passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, checks, recommendations, metrics: { titleLength: metadata.titleLength, descriptionLength: metadata.descriptionLength, wordCount: content.wordCount, h1Count: content.h1s.length, h2Count: content.h2s.length, h3Count: content.h3s.length, faqCount: content.faqCount, internalLinks: links.internal.length, externalLinks: links.external.length, images: media.imageCount, imagesWithAlt: media.altCount }, analyzedAt: new Date().toISOString() };
}
function severityRank(value) { return { critical: 0, warning: 1, info: 2 }[value] ?? 3; }
module.exports = { analyzePage };
