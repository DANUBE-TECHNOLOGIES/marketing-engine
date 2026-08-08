"use strict";

function normalizePath(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .replace(
      /^\.+|\.+$/g,
      ""
    );
}

function getPath(
  source,
  path
) {
  const normalized =
    normalizePath(
      path
    );

  if (!normalized) {
    return undefined;
  }

  const parts =
    normalized
      .split(
        "."
      )
      .filter(
        Boolean
      );

  let current =
    source;

  for (
    const part
    of parts
  ) {
    if (
      current ===
        null ||
      current ===
        undefined ||
      (
        typeof current !==
          "object" &&
        typeof current !==
          "function"
      )
    ) {
      return undefined;
    }

    if (
      !Object.prototype
        .hasOwnProperty.call(
          current,
          part
        )
    ) {
      return undefined;
    }

    current =
      current[
        part
      ];
  }

  return current;
}

module.exports = {
  normalizePath,
  getPath,
};
