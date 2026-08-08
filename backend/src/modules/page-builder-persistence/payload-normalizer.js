"use strict";

function cleanText(
  value,
  fallback = ""
) {
  return String(
    value ?? fallback
  )
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromSlug(
  slug
) {
  const normalized =
    cleanText(slug)
      .replace(
        /^\/+|\/+$/g,
        ""
      )
      .replace(
        /[-_]+/g,
        " "
      );

  if (!normalized) {
    return "Page";
  }

  if (
    normalized === "home" ||
    normalized === "accueil"
  ) {
    return "Accueil";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0)
          .toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function normalizeBlocks(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    (block, index) => ({
      ...(block &&
      typeof block === "object"
        ? block
        : {}),

      position:
        Number.isInteger(
          block?.position
        )
          ? block.position
          : index,
    })
  );
}

function normalizePublished({
  input,
  page,
  existing,
  status,
}) {
  if (
    typeof input.published ===
    "boolean"
  ) {
    return input.published;
  }

  if (
    typeof page.published ===
    "boolean"
  ) {
    return page.published;
  }

  if (
    status === "published"
  ) {
    return true;
  }

  if (
    [
      "draft",
      "review",
      "archived",
    ].includes(status)
  ) {
    return false;
  }

  return existing.published ===
    true;
}

function normalizePageBuilderPayload({
  body,
  params,
  existingPage,
} = {}) {
  const input =
    body &&
    typeof body === "object" &&
    !Array.isArray(body)
      ? body
      : {};

  const page =
    input.page &&
    typeof input.page === "object" &&
    !Array.isArray(input.page)
      ? input.page
      : {};

  const existing =
    existingPage &&
    typeof existingPage === "object"
      ? existingPage
      : {};

  const pageSlug =
    cleanText(
      params?.pageSlug ||
      input.pageSlug ||
      input.slug ||
      page.slug ||
      existing.slug
    );

  const title =
    cleanText(
      input.title ||
      page.title ||
      existing.title ||
      input.seoTitle ||
      page.seoTitle ||
      existing.seoTitle ||
      titleFromSlug(
        pageSlug
      )
    );

  const status =
    cleanText(
      input.status ||
      page.status ||
      existing.status ||
      "draft"
    );

  return {
    ...existing,
    ...input,
    ...page,

    agencyId:
      cleanText(
        params?.agencyId ||
        input.agencyId ||
        existing.agencyId
      ),

    pageSlug,

    slug:
      pageSlug,

    title,

    seoTitle:
      cleanText(
        input.seoTitle ||
        page.seoTitle ||
        existing.seoTitle ||
        title
      ),

    seoDescription:
      cleanText(
        input.seoDescription ||
        page.seoDescription ||
        existing.seoDescription
      ),

    status,

    published:
      normalizePublished({
        input,
        page,
        existing,
        status,
      }),

    blocks:
      normalizeBlocks(
        input.blocks ||
        page.blocks ||
        existing.blocks
      ),
  };
}

module.exports = {
  cleanText,
  normalizeBlocks,
  normalizePageBuilderPayload,
  normalizePublished,
  titleFromSlug,
};
