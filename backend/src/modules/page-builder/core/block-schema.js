"use strict";

const CURRENT_BLOCK_SCHEMA_VERSION = 1;

const BLOCK_STATUS_VALUES =
  Object.freeze([
    "draft",
    "published",
    "archived",
  ]);

function isPlainObject(
  value
) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function deepClone(
  value
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function normalizeBlockType(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function normalizeStatus(
  value
) {
  const normalized =
    String(
      value || "draft"
    )
      .trim()
      .toLowerCase();

  return BLOCK_STATUS_VALUES
    .includes(normalized)
      ? normalized
      : "draft";
}

function normalizePosition(
  value,
  fallback = 0
) {
  const parsed =
    Number(value);

  if (
    Number.isInteger(parsed) &&
    parsed >= 0
  ) {
    return parsed;
  }

  return fallback;
}

module.exports = {
  CURRENT_BLOCK_SCHEMA_VERSION,
  BLOCK_STATUS_VALUES,
  isPlainObject,
  deepClone,
  normalizeBlockType,
  normalizeStatus,
  normalizePosition,
};
