"use strict";

const { BlockRegistry } = require("../page-builder");
const { pageBuilderError } = require("../page-builder/errors");

const PAGE_STATUSES = new Set([
  "draft",
  "review",
  "published",
  "archived",
]);

function requiredText(value, field, max) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw pageBuilderError(
      `${field} est obligatoire.`,
      "PAGE_FIELD_REQUIRED",
      400,
      { field }
    );
  }

  const normalized = value.trim();

  if (normalized.length > max) {
    throw pageBuilderError(
      `${field} dépasse ${max} caractères.`,
      "PAGE_FIELD_TOO_LONG",
      400,
      { field, max }
    );
  }

  return normalized;
}

function optionalText(value, field, max) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  return requiredText(String(value), field, max);
}

function normalizeSlug(value) {
  if (value === "") return "";

  return requiredText(value, "slug", 180)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePosition(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function validatePagePayload(body = {}) {
  const pageInput = body.page || body;
  const registry = new BlockRegistry();

  const status = String(
    pageInput.status || "draft"
  ).toLowerCase();

  if (!PAGE_STATUSES.has(status)) {
    throw pageBuilderError(
      "Statut de page invalide.",
      "INVALID_PAGE_STATUS",
      400,
      {
        allowed: [...PAGE_STATUSES],
      }
    );
  }

  const rawBlocks =
    body.blocks ||
    pageInput.blocks ||
    [];

  const normalizedInputs = rawBlocks.map((block, index) => ({
    ...block,
    position: normalizePosition(block?.position ?? block?.displayOrder, index),
  }));

  const blocks = registry.validatePage(normalizedInputs);

  return {
    page: {
      title: requiredText(
        pageInput.title,
        "title",
        180
      ),

      slug: normalizeSlug(
        pageInput.slug === undefined
          ? ""
          : String(pageInput.slug)
      ),

      status,

      seoTitle: optionalText(
        pageInput.seoTitle,
        "seoTitle",
        70
      ),

      metaDescription: optionalText(
        pageInput.seoDescription ??
          pageInput.metaDescription,
        "metaDescription",
        180
      ),

      published:
        status === "published" ||
        pageInput.published === true,
    },

    blocks: blocks.map((block, index) => ({
      type: block.type,
      status: block.status,
      position: normalizePosition(
        block.position ?? normalizedInputs[index]?.position,
        index
      ),
      content: block.content,
      settings: block.settings || {},
      seo:
        block.seo &&
        typeof block.seo === "object"
          ? block.seo
          : {},
      visibleDesktop:
        block.visibleDesktop !== false,
      visibleMobile:
        block.visibleMobile !== false,
    })),
  };
}

module.exports = {
  validatePagePayload,
};
