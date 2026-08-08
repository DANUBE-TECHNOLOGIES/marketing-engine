"use strict";

function cleanText(
  value
) {
  return String(
    value ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSeoTitleLength(
  value,
  limit = 65
) {
  const normalized =
    cleanText(value);

  if (
    normalized.length <= limit
  ) {
    return normalized;
  }

  const ellipsis =
    "…";

  const maximumContentLength =
    Math.max(
      1,
      limit -
      ellipsis.length
    );

  const fragment =
    normalized
      .slice(
        0,
        maximumContentLength
      )
      .trim();

  const lastSeparator =
    Math.max(
      fragment.lastIndexOf(" | "),
      fragment.lastIndexOf(" - "),
      fragment.lastIndexOf(" — ")
    );

  if (
    lastSeparator >= 25
  ) {
    const shortened =
      fragment
        .slice(
          0,
          lastSeparator
        )
        .trim();

    return (
      shortened.length <= limit
        ? shortened
        : shortened
            .slice(
              0,
              maximumContentLength
            )
            .trimEnd() +
          ellipsis
    );
  }

  const lastSpace =
    fragment.lastIndexOf(" ");

  const shortened =
    lastSpace >= 25
      ? fragment
          .slice(
            0,
            lastSpace
          )
          .trim()
      : fragment;

  return (
    shortened +
    ellipsis
  ).slice(
    0,
    limit
  );
}

function buildSeoUpdate(
  item
) {
  const data = {};

  if (
    item.actions
      ?.setSeoTitle &&
    cleanText(
      item.generated
        ?.seoTitle
    )
  ) {
    data.seoTitle =
      cleanText(
        item.generated
          .seoTitle
      );
  }

  if (
    item.actions
      ?.setMetaDescription &&
    cleanText(
      item.generated
        ?.metaDescription
    )
  ) {
    data.metaDescription =
      cleanText(
        item.generated
          .metaDescription
      );
  }

  return data;
}

function summarizeExecution(
  items
) {
  return {
    pagesProcessed:
      items.length,

    pagesChanged:
      items.filter(
        (item) =>
          item.changed === true
      ).length,

    pagesUnchanged:
      items.filter(
        (item) =>
          item.changed !== true
      ).length,

    seoTitlesCreated:
      items.filter(
        (item) =>
          item.fields
            ?.includes(
              "seoTitle"
            )
      ).length,

    metaDescriptionsCreated:
      items.filter(
        (item) =>
          item.fields
            ?.includes(
              "metaDescription"
            )
      ).length,

    writeActions:
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          (
            item.fields
              ?.length ||
            0
          ),
        0
      ),
  };
}

module.exports = {
  buildSeoUpdate,
  cleanText,
  normalizeSeoTitleLength,
  summarizeExecution,
};
