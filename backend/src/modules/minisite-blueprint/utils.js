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

function slugify(
  value
) {
  return cleanText(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /['’]/g,
      "-"
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "")
    .replace(
      /-{2,}/g,
      "-"
    );
}

function stableClone(
  value
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      stableClone
    );
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(
        (key) => [
          key,
          stableClone(
            value[key]
          ),
        ]
      )
  );
}

function compact(
  object
) {
  return Object.fromEntries(
    Object.entries(
      object
    ).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
}

function truncate(
  value,
  limit
) {
  const normalized =
    cleanText(value);

  if (
    normalized.length <= limit
  ) {
    return normalized;
  }

  return normalized
    .slice(
      0,
      Math.max(
        0,
        limit - 1
      )
    )
    .trimEnd() +
    "…";
}

function humanizeSlug(
  slug
) {
  const normalized =
    cleanText(slug)
      .replace(
        /[-_]+/g,
        " "
      );

  if (!normalized) {
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

module.exports = {
  cleanText,
  compact,
  humanizeSlug,
  slugify,
  stableClone,
  truncate,
};
