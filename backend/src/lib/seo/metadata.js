"use strict";

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = compact(item);
      if (normalized !== undefined) output[key] = normalized;
    }
    return Object.keys(output).length ? output : undefined;
  }
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}

function firstImage(blocks = []) {
  for (const block of blocks) {
    const content = block?.content || {};
    const candidate = content.imageUrl || content.heroImageUrl || content.image;
    if (candidate) return candidate;
  }
  return undefined;
}

function buildMetadata({ site, page, blocks = [], baseUrl }) {
  const title = page?.seoTitle || page?.seo?.title || page?.title;
  const description = page?.metaDescription || page?.seo?.description;
  const canonical = page?.path || site?.basePath;
  const image = firstImage(blocks) || site?.heroImageUrl || site?.logoUrl;
  return compact({
    title,
    description,
    canonical,
    robots: page?.published === false || page?.status === "draft" ? "noindex,nofollow" : "index,follow",
    openGraph: { title, description, url: canonical, type: page?.pageType === "destination" ? "article" : "website", images: image ? [image] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
    baseUrl,
  });
}

module.exports = { compact, buildMetadata };
