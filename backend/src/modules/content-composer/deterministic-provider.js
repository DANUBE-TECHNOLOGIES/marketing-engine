"use strict";

function interpolate(
  value,
  context
) {
  if (
    typeof value !==
    "string"
  ) {
    return value;
  }

  const replacements = {
    "{{agency.name}}":
      context.agency.name ||
      "",

    "{{agency.city}}":
      context.agency.city ||
      "",

    "{{agency.phone}}":
      context.agency.phone ||
      "",

    "{{agency.email}}":
      context.agency.email ||
      "",

    "{{seo.primaryKeyword}}":
      context.seo.primaryKeyword ||
      "",

    "{{seo.targetLocation}}":
      context.seo.targetLocation ||
      context.agency.city ||
      "",
  };

  let output =
    value;

  for (
    const [
      token,
      replacement,
    ]
    of Object.entries(
      replacements
    )
  ) {
    output =
      output.split(
        token
      ).join(
        replacement
      );
  }

  return output;
}

function deepInterpolate(
  value,
  context
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      item =>
        deepInterpolate(
          item,
          context
        )
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value
      ).map(
        ([
          key,
          item,
        ]) => [
          key,
          deepInterpolate(
            item,
            context
          ),
        ]
      )
    );
  }

  return interpolate(
    value,
    context
  );
}

class DeterministicContentProvider {
  async generate({
    template,
    context,
    instructions,
  }) {
    const sections =
      Array.isArray(
        template?.sections
      )
        ? template.sections
        : [];

    const renderedSections =
      sections.map(
        section => ({
          ...section,

          content:
            deepInterpolate(
              section.content ||
              {},
              context
            ),
        })
      );

    return {
      provider:
        "deterministic",

      model:
        null,

      instructions:
        instructions ||
        "",

      sections:
        renderedSections,

      seo:
        deepInterpolate(
          template?.seo ||
          {},
          context
        ),
    };
  }
}

module.exports = {
  DeterministicContentProvider,
  deepInterpolate,
};
