"use strict";

const { visibleText, normalize } = require("./similarity-guard");
const { persistenceValidationIssues } = require("./persistence-preflight");

function words(value) {
  return normalize(value).split(/\s+/).filter(Boolean).length;
}

function blockContent(block) {
  return block?.content && typeof block.content === "object" ? block.content : {};
}

function blockType(block) {
  return normalize(block?.blockType || block?.type).replace(/\s+/g, "-");
}

function collectLinks(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectLinks(item, output));
    return output;
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === "href" || key === "url") && typeof item === "string" && item.trim()) output.push(item.trim());
    else if (item && typeof item === "object") collectLinks(item, output);
  }
  return output;
}

function imageIssues(blocks = []) {
  const issues = [];
  for (const block of blocks) {
    const type = blockType(block);
    const content = blockContent(block);
    const image = content.imageUrl || content.image || content.heroImageUrl || content.backgroundImage;
    if (!image) continue;
    const decorative = content.decorative === true || content.ariaHidden === true;
    const alt = String(content.alt || content.imageAlt || content.altText || "").trim();
    if (!decorative && !alt && !type.includes("hero")) {
      issues.push({ code: "IMAGE_ALT_MISSING", blockId: block.id || null, blockType: type });
    }
  }
  return issues;
}

function pageKind(page = {}) {
  const source = normalize(`${page.slug || ""} ${page.title || ""}`);
  if (!source || source === "home" || source === "accueil") return "home";
  if (source.includes("croisi")) return "cruise";
  if (source.includes("circuit")) return "circuit";
  if (source.includes("sur-mesure") || source.includes("sur mesure")) return "custom";
  if (source.includes("sejour") || source.includes("club")) return "stay";
  if (source.includes("billet") || source.includes("vol")) return "ticketing";
  if (source.includes("agence") || source.includes("contact")) return "agency";
  return "generic";
}

function isCommercial(kind) {
  return ["cruise", "circuit", "custom", "stay", "ticketing"].includes(kind);
}

function expectedPath(plan, page) {
  const root = `/agence/${plan.siteSlug}`;
  const slug = String(page.slug || "").trim();
  return !slug || ["home", "accueil"].includes(normalize(slug)) ? root : `${root}/${slug}`;
}

function pageQuality(plan, page, { minimumWords = 120 } = {}) {
  const blocks = page.optimizedBlocks || page.after || [];
  const text = visibleText(blocks);
  const count = words(text);
  const kind = pageKind(page);
  const links = collectLinks(blocks);
  const internalLinks = links.filter((href) => href.startsWith(`/agence/${plan.siteSlug}`));
  const issues = [];

  if (page.published === true && count < minimumWords) {
    issues.push({ code: "THIN_CONTENT", severity: "warning", wordCount: count, minimumWords });
  }

  if (isCommercial(kind) && !internalLinks.some((href) => href.includes("/contact"))) {
    issues.push({ code: "COMMERCIAL_CONTACT_LINK_MISSING", severity: "blocking" });
  }

  if (isCommercial(kind) && internalLinks.length < 2) {
    issues.push({ code: "COMMERCIAL_INTERNAL_LINKING_WEAK", severity: "warning", internalLinks: internalLinks.length });
  }

  for (const issue of imageIssues(blocks)) issues.push({ ...issue, severity: "warning" });

  return {
    agencyId: plan.agencyId,
    siteSlug: plan.siteSlug,
    slug: page.slug,
    pageKind: kind,
    published: page.published === true,
    expectedCanonicalPath: expectedPath(plan, page),
    expectedInSitemap: page.published === true,
    wordCount: count,
    internalLinks,
    issues,
  };
}

/*
 * This graph deliberately measures editorial/block-level linking only.
 * It MUST NOT decide crawlability: the public renderer adds site-wide header/footer
 * links that are not represented inside Website Designer blocks. Crawlability and
 * true orphan blocking belong to minisite-structured-data/crawlability-audit.
 */
function editorialLinkingIssues(rows) {
  const publishedPaths = new Map(rows.filter((row) => row.published).map((row) => [row.expectedCanonicalPath, row]));
  const incoming = new Map([...publishedPaths.keys()].map((path) => [path, 0]));

  for (const row of rows) {
    for (const href of row.internalLinks || []) {
      const path = String(href).split(/[?#]/)[0];
      if (incoming.has(path)) incoming.set(path, incoming.get(path) + 1);
    }
  }

  const issues = [];
  for (const [path, count] of incoming.entries()) {
    const row = publishedPaths.get(path);
    if (!row || row.pageKind === "home") continue;
    if (count === 0) {
      issues.push({
        code: "EDITORIAL_INTERNAL_LINK_MISSING",
        severity: "warning",
        siteSlug: row.siteSlug,
        slug: row.slug,
        path,
      });
    }
  }
  return issues;
}

function preRolloutQualityReport(plans, options = {}) {
  const pages = [];
  for (const plan of plans || []) {
    for (const page of plan.pages || []) pages.push(pageQuality(plan, page, options));
  }
  const networkIssues = editorialLinkingIssues(pages);
  const pageIssues = pages.flatMap((page) => page.issues.map((issue) => ({ ...issue, siteSlug: page.siteSlug, slug: page.slug, path: page.expectedCanonicalPath })));
  const persistenceIssues = persistenceValidationIssues(plans);
  const allIssues = [...networkIssues, ...pageIssues, ...persistenceIssues];
  const blocking = allIssues.filter((issue) => issue.severity === "blocking");
  const warnings = allIssues.filter((issue) => issue.severity !== "blocking");

  return {
    minimumWords: Number(options.minimumWords || 120),
    pagesChecked: pages.length,
    persistencePagesChecked: (plans || []).reduce((sum, plan) => sum + (plan?.pages || []).length, 0),
    persistenceBlockingCount: persistenceIssues.length,
    blockingCount: blocking.length,
    warningCount: warnings.length,
    blocked: blocking.length > 0,
    crawlabilityAuthority: "minisite-structured-data/crawlability-audit",
    blocking,
    warnings,
    pages,
  };
}

module.exports = { collectLinks, editorialLinkingIssues, imageIssues, pageKind, pageQuality, preRolloutQualityReport };
