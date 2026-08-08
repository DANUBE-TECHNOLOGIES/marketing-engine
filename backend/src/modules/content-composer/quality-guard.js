"use strict";

const {
  wordCount,
} =
  require(
    "./text-utils"
  );

const {
  factualSafetyCheck,
} =
  require(
    "./factual-safety"
  );

const {
  duplicateSectionCheck,
} =
  require(
    "./duplication"
  );

const {
  scoreSeo,
} =
  require(
    "./seo-scorer"
  );

function expectedSectionTypes(
  template
) {
  return (
    template.sections ||
    []
  )
    .map(
      section =>
        section.sectionType
    )
    .filter(
      Boolean
    );
}

function generatedSectionTypes(
  content
) {
  return (
    content.sections ||
    []
  )
    .map(
      section =>
        section.sectionType
    )
    .filter(
      Boolean
    );
}

function structuralCheck({
  template,
  content,
}) {
  const expected =
    expectedSectionTypes(
      template
    );

  const generated =
    generatedSectionTypes(
      content
    );

  const issues =
    [];

  for (
    const sectionType
    of expected
  ) {
    if (
      !generated.includes(
        sectionType
      )
    ) {
      issues.push({
        code:
          "MISSING_SECTION",

        severity:
          "error",

        sectionType,
      });
    }
  }

  for (
    const section
    of content.sections ||
    []
  ) {
    const words =
      wordCount(
        JSON.stringify(
          section.content ||
          {}
        )
      );

    if (
      words <
      2
    ) {
      issues.push({
        code:
          "EMPTY_SECTION",

        severity:
          "warning",

        sectionType:
          section.sectionType,

        words,
      });
    }
  }

  return {
    valid:
      !issues.some(
        issue =>
          issue.severity ===
          "error"
      ),

    expected,
    generated,
    issues,
  };
}

function calculateQualityScore({
  seo,
  structural,
  factual,
  duplication,
}) {
  let score =
    seo.score;

  const penalties = {
    structuralError:
      20,

    factualError:
      30,

    warning:
      5,

    duplicate:
      8,
  };

  score -=
    structural.issues.filter(
      issue =>
        issue.severity ===
        "error"
    ).length *
    penalties.structuralError;

  score -=
    factual.issues.filter(
      issue =>
        issue.severity ===
        "error"
    ).length *
    penalties.factualError;

  score -=
    factual.issues.filter(
      issue =>
        issue.severity ===
        "warning"
    ).length *
    penalties.warning;

  score -=
    duplication.issues.length *
    penalties.duplicate;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        score
      )
    )
  );
}

function evaluateGeneratedContent({
  template,
  content,
  context,
  minimumScore =
    55,
}) {
  const structural =
    structuralCheck({
      template,
      content,
    });

  const factual =
    factualSafetyCheck({
      content,
      context,
    });

  const duplication =
    duplicateSectionCheck(
      content.sections ||
      []
    );

  const seo =
    scoreSeo({
      content,
      context,
    });

  const score =
    calculateQualityScore({
      seo,
      structural,
      factual,
      duplication,
    });

  const blockingIssues = [
    ...structural.issues,
    ...factual.issues,
  ].filter(
    issue =>
      issue.severity ===
      "error"
  );

  const accepted =
    blockingIssues.length ===
      0 &&
    score >=
      minimumScore;

  return {
    accepted,

    score,

    minimumScore,

    structural,

    factual,

    duplication,

    seo,

    blockingIssues,
  };
}

module.exports = {
  structuralCheck,
  calculateQualityScore,
  evaluateGeneratedContent,
};
