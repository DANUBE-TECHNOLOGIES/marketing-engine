"use strict";

import { getBlockDefinition } from "./block-catalog";

export function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function createLocalId(prefix = "block") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function normalizeBlock(block, index = 0) {
  const type =
    String(block?.type || block?.blockType || block?.sectionType || "rich_text")
      .replace(/--\d+$/, "")
      .trim()
      .toLowerCase();

  const definition = getBlockDefinition(type);
  const rawPosition =
    block?.position ??
    block?.displayOrder ??
    index;

  return {
    id: String(block?.id || createLocalId()),
    type,
    status: String(block?.status || "draft"),
    position: Number.isFinite(Number(rawPosition))
      ? Number(rawPosition)
      : index,
    content: {
      ...(definition?.defaults
        ? deepClone(definition.defaults)
        : {}),
      ...(block?.content && typeof block.content === "object"
        ? deepClone(block.content)
        : block?.jsonContent && typeof block.jsonContent === "object"
          ? deepClone(block.jsonContent)
          : {}),
    },
    settings:
      block?.settings && typeof block.settings === "object"
        ? deepClone(block.settings)
        : {},
  };
}

export function normalizePage(page, index = 0) {
  const blocks =
    page?.blocks ||
    page?.sections ||
    page?.content?.blocks ||
    [];

  const status = String(page?.status || "draft");
  const hasExplicitSlug =
    page &&
    Object.prototype.hasOwnProperty.call(page, "slug") &&
    page.slug !== null &&
    page.slug !== undefined;

  return {
    id: String(page?.id || createLocalId("page")),
    slug: hasExplicitSlug
      ? String(page.slug)
      : `page-${index + 1}`,
    title: String(
      page?.title ||
      page?.name ||
      page?.seoTitle ||
      `Page ${index + 1}`
    ),
    status,
    published:
      typeof page?.published === "boolean"
        ? page.published
        : status === "published",
    seoTitle: String(page?.seoTitle || page?.title || ""),
    seoDescription: String(
      page?.seoDescription ||
      page?.seoDesc ||
      ""
    ),
    blocks: Array.isArray(blocks)
      ? blocks
          .map(normalizeBlock)
          .sort((a, b) => a.position - b.position)
          .map((block, blockIndex) => ({
            ...block,
            position: blockIndex,
          }))
      : [],
  };
}

export function normalizeSite(site) {
  const pages =
    site?.pages ||
    site?.miniSitePages ||
    site?.data?.pages ||
    [];

  return {
    id: String(site?.id || site?.slug || ""),
    slug: String(site?.slug || site?.id || ""),
    name: String(site?.name || site?.title || "Mini-site"),
    agencyId:
      site?.agencyId === undefined ||
      site?.agencyId === null
        ? null
        : String(site.agencyId),
    status: String(site?.status || "draft"),
    pages: Array.isArray(pages)
      ? pages.map(normalizePage)
      : [],
  };
}

export function createBlock(type, position) {
  const definition = getBlockDefinition(type);

  if (!definition) {
    throw new Error(`Type de bloc inconnu : ${type}`);
  }

  return normalizeBlock({
    id: createLocalId(),
    type,
    status: "draft",
    position,
    content: deepClone(definition.defaults),
    settings: {},
  });
}

export function reorderBlocks(blocks) {
  return blocks.map((block, index) => ({
    ...block,
    position: index,
  }));
}

export function updateBlockInPage(page, blockId, updater) {
  return {
    ...page,
    blocks: page.blocks.map((block) =>
      block.id === blockId
        ? updater(deepClone(block))
        : block
    ),
  };
}

export function serializePage(page) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    status: page.status,
    published:
      page.status === "published"
        ? true
        : page.status === "draft" ||
            page.status === "review" ||
            page.status === "archived"
          ? false
          : page.published === true,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    blocks: reorderBlocks(page.blocks).map((block) => ({
      id: block.id,
      type: block.type,
      status: block.status,
      position: block.position,
      content: deepClone(block.content),
      settings: deepClone(block.settings || {}),
    })),
  };
}