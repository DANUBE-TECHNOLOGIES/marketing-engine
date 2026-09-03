"use strict";

const {
  normalizeText,
  words,
} =
  require(
    "./text-utils"
  );

function jaccardSimilarity(
  left,
  right
) {
  const leftSet =
    new Set(
      words(
        left
      )
    );

  const rightSet =
    new Set(
      words(
        right
      )
    );

  if (
    leftSet.size ===
      0 &&
    rightSet.size ===
      0
  ) {
    return 1;
  }

  const intersection =
    [
      ...leftSet,
    ].filter(
      token =>
        rightSet.has(
          token
        )
    ).length;

  const union =
    new Set([
      ...leftSet,
      ...rightSet,
    ]).size;

  if (
    union ===
    0
  ) {
    return 0;
  }

  return intersection /
    union;
}

function duplicateSectionCheck(
  sections
) {
  const issues =
    [];

  const normalized =
    sections.map(
      section => ({
        sectionType:
          section.sectionType,

        text:
          normalizeText(
            JSON.stringify(
              section.content ||
              {}
            )
          ),
      })
    );

  for (
    let i = 0;
    i < normalized.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < normalized.length;
      j += 1
    ) {
      const left =
        normalized[i];

      const right =
        normalized[j];

      if (
        left.text.length <
          80 ||
        right.text.length <
          80
      ) {
        continue;
      }

      const similarity =
        jaccardSimilarity(
          left.text,
          right.text
        );

      if (
        similarity >=
        0.82
      ) {
        issues.push({
          code:
            "DUPLICATE_SECTIONS",

          severity:
            "warning",

          sections: [
            left.sectionType,
            right.sectionType,
          ],

          similarity:
            Number(
              similarity.toFixed(
                3
              )
            ),
        });
      }
    }
  }

  return {
    issues,
  };
}

module.exports = {
  jaccardSimilarity,
  duplicateSectionCheck,
};
