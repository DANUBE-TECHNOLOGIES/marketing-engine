"use strict";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractFirstTagText(html, tagName) {
  const tag = String(tagName || "").replace(/[^a-z0-9-]/gi, "");
  if (!tag) return "";
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function extractHeroText(html) {
  const match = String(html || "").match(/<p\b[^>]*class=["'][^"']*public-site-hero-text[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  return match ? stripTags(match[1]) : "";
}

function extractCanonical(html) {
  const source = String(html || "");
  const tags = source.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel=["'][^"']*canonical[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (href?.[1]) return decodeHtml(href[1]).trim();
  }
  return "";
}

function robotsDirectives(html) {
  const source = String(html || "");
  const tags = source.match(/<meta\b[^>]*>/gi) || [];
  const values = [];
  for (const tag of tags) {
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== "robots" && name !== "googlebot") continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
    if (content) values.push(decodeHtml(content).toLowerCase());
  }
  return values;
}

function allowsIndexing(html) {
  return !robotsDirectives(html).some((value) => /(^|[,\s])noindex([,\s]|$)/i.test(value));
}

function sameCanonical(actual, expected) {
  if (!actual || !expected) return false;
  try {
    const left = new URL(actual);
    const right = new URL(expected);
    return left.origin.toLowerCase() === right.origin.toLowerCase()
      && left.pathname.replace(/\/+$/g, "") === right.pathname.replace(/\/+$/g, "");
  } catch (_error) {
    return String(actual).replace(/\/+$/g, "") === String(expected).replace(/\/+$/g, "");
  }
}

function expectedHeroProofs(expectedChanges = []) {
  const hero = (expectedChanges || []).filter((change) => String(change?.blockType || "").toLowerCase() === "hero");
  return {
    title: hero.find((change) => change?.field === "title")?.next ?? null,
    subtitle: hero.find((change) => change?.field === "subtitle")?.next ?? null,
  };
}

function validatePublicHtml({ html, canonicalUrl, expectedChanges = [] } = {}) {
  const source = String(html || "");
  const proofs = expectedHeroProofs(expectedChanges);
  const h1 = extractFirstTagText(source, "h1");
  const heroText = extractHeroText(source);
  const canonical = extractCanonical(source);
  const indexable = allowsIndexing(source);
  const h1Ok = proofs.title === null || h1 === String(proofs.title).trim();
  const heroTextOk = proofs.subtitle === null || heroText === String(proofs.subtitle).trim();
  const canonicalOk = sameCanonical(canonical, canonicalUrl);

  return {
    ok: Boolean(source) && h1Ok && heroTextOk && canonicalOk && indexable,
    h1: { expected: proofs.title, actual: h1 || null, ok: h1Ok },
    heroText: { expected: proofs.subtitle, actual: heroText || null, ok: heroTextOk },
    canonical: { expected: canonicalUrl || null, actual: canonical || null, ok: canonicalOk },
    indexable,
    robots: robotsDirectives(source),
  };
}

module.exports = {
  allowsIndexing,
  decodeHtml,
  expectedHeroProofs,
  extractCanonical,
  extractFirstTagText,
  extractHeroText,
  robotsDirectives,
  sameCanonical,
  stripTags,
  validatePublicHtml,
};
