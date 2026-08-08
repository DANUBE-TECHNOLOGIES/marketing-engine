"use strict";

const {
  resolveTemplate,
} =
  require(
    "./resolver"
  );

function resolveValue(
  value,
  context,
  options,
  collected
) {
  if (
    typeof value ===
      "string"
  ) {
    const result =
      resolveTemplate(
        value,
        context,
        options
      );

    for (
      const variable
      of result.variables
    ) {
      collected.variables.add(
        variable
      );
    }

    for (
      const missing
      of result.missing
    ) {
      collected.missing.add(
        missing
      );
    }

    return result.value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      item =>
        resolveValue(
          item,
          context,
          options,
          collected
        )
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const output =
      {};

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        value
      )
    ) {
      output[
        key
      ] =
        resolveValue(
          child,
          context,
          options,
          collected
        );
    }

    return output;
  }

  return value;
}

function resolveObjectTemplates(
  input,
  context = {},
  options = {}
) {
  const collected = {
    variables:
      new Set(),

    missing:
      new Set(),
  };

  const value =
    resolveValue(
      input,
      context,
      options,
      collected
    );

  return {
    value,

    variables:
      [
        ...collected.variables,
      ],

    missing:
      [
        ...collected.missing,
      ],
  };
}

module.exports = {
  resolveObjectTemplates,
};
