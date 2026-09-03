"use strict";

const {
  getPath,
} =
  require(
    "./path"
  );

const {
  stringifyVariableValue,
} =
  require(
    "./value"
  );

const VARIABLE_PATTERN =
  /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function extractVariables(
  template
) {
  const value =
    String(
      template ||
      ""
    );

  const variables =
    [];

  const seen =
    new Set();

  let match;

  while (
    (
      match =
        VARIABLE_PATTERN.exec(
          value
        )
    ) !== null
  ) {
    const key =
      match[1];

    if (
      !seen.has(
        key
      )
    ) {
      seen.add(
        key
      );

      variables.push(
        key
      );
    }
  }

  /*
   * RegExp global :
   * remettre lastIndex à zéro pour les appels suivants.
   */
  VARIABLE_PATTERN.lastIndex =
    0;

  return variables;
}

function resolveTemplate(
  template,
  context = {},
  {
    strict =
      false,

    preserveUnknown =
      false,
  } = {}
) {
  const source =
    String(
      template ??
      ""
    );

  const missing =
    [];

  const resolved =
    source.replace(
      VARIABLE_PATTERN,
      (
        original,
        key
      ) => {
        const value =
          getPath(
            context,
            key
          );

        if (
          value ===
            undefined ||
          value ===
            null ||
          value ===
            ""
        ) {
          missing.push(
            key
          );

          if (
            preserveUnknown
          ) {
            return original;
          }

          return "";
        }

        return stringifyVariableValue(
          value
        );
      }
    );

  VARIABLE_PATTERN.lastIndex =
    0;

  const uniqueMissing =
    [
      ...new Set(
        missing
      ),
    ];

  if (
    strict &&
    uniqueMissing.length >
      0
  ) {
    const error =
      new Error(
        `Variables introuvables : ${uniqueMissing.join(", ")}`
      );

    error.code =
      "CONTENT_VARIABLES_MISSING";

    error.statusCode =
      400;

    error.variables =
      uniqueMissing;

    throw error;
  }

  return {
    value:
      resolved,

    variables:
      extractVariables(
        source
      ),

    missing:
      uniqueMissing,
  };
}

module.exports = {
  VARIABLE_PATTERN,
  extractVariables,
  resolveTemplate,
};
