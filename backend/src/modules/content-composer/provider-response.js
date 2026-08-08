"use strict";

function extractUsage(
  raw
) {
  const usage =
    raw?.usage;

  if (!usage) {
    return null;
  }

  return {
    inputTokens:
      Number(
        usage.input_tokens ??
        usage.prompt_tokens ??
        0
      ),

    outputTokens:
      Number(
        usage.output_tokens ??
        usage.completion_tokens ??
        0
      ),

    totalTokens:
      Number(
        usage.total_tokens ??
        (
          Number(
            usage.input_tokens ??
            usage.prompt_tokens ??
            0
          ) +
          Number(
            usage.output_tokens ??
            usage.completion_tokens ??
            0
          )
        )
      ),
  };
}

function extractProviderOutput(
  raw
) {
  if (
    typeof raw ===
    "string"
  ) {
    return {
      output:
        raw,

      usage:
        null,
    };
  }

  if (
    !raw ||
    typeof raw !==
      "object"
  ) {
    return {
      output:
        raw,

      usage:
        null,
    };
  }

  if (
    raw.output &&
    typeof raw.output ===
      "object" &&
    !Array.isArray(
      raw.output
    )
  ) {
    return {
      output:
        raw.output,

      usage:
        extractUsage(
          raw
        ),
    };
  }

  if (
    typeof raw.text ===
    "string"
  ) {
    return {
      output:
        raw.text,

      usage:
        extractUsage(
          raw
        ),
    };
  }

  if (
    typeof raw.output_text ===
    "string"
  ) {
    return {
      output:
        raw.output_text,

      usage:
        extractUsage(
          raw
        ),
    };
  }

  return {
    output:
      raw,

    usage:
      extractUsage(
        raw
      ),
  };
}

module.exports = {
  extractProviderOutput,
  extractUsage,
};
