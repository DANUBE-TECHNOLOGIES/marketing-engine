"use strict";

export function normalizeFactualityAudit(
  value
) {
  const input =
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};

  const issues =
    Array.isArray(input.issues)
      ? input.issues
          .filter(
            (issue) =>
              issue &&
              typeof issue ===
                "object"
          )
          .map(
            (issue, index) => ({
              id:
                String(
                  issue.id ||
                  `issue-${index}`
                ),

              rule:
                String(
                  issue.rule ||
                  "unknown"
                ),

              path:
                String(
                  issue.path ||
                  ""
                ),

              severity:
                issue.severity ===
                "blocked"
                  ? "blocked"
                  : "warning",

              message:
                String(
                  issue.message ||
                  "Affirmation à vérifier."
                ),

              excerpt:
                String(
                  issue.excerpt ||
                  ""
                ),

              requiredFields:
                Array.isArray(
                  issue.requiredFields
                )
                  ? issue.requiredFields
                      .map(String)
                  : [],
            })
          )
      : [];

  const blockerCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "blocked"
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning"
    ).length;

  return {
    status:
      blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "safe",

    allowed:
      blockerCount === 0,

    issueCount:
      issues.length,

    blockerCount,

    warningCount,

    groundingAvailable:
      input.groundingAvailable ===
      true,

    issues,
  };
}

export function factualityLabel(
  audit
) {
  const normalized =
    normalizeFactualityAudit(
      audit
    );

  if (
    normalized.status ===
    "blocked"
  ) {
    return "Contenu bloqué";
  }

  if (
    normalized.status ===
    "warning"
  ) {
    return "Contenu à vérifier";
  }

  return "Contrôle factuel validé";
}

export function canApplyEditorialSuggestions(
  result
) {
  return normalizeFactualityAudit(
    result?.factuality
  ).allowed;
}

export function factualityIssuesBySeverity(
  audit,
  severity
) {
  return normalizeFactualityAudit(
    audit
  ).issues.filter(
    (issue) =>
      issue.severity ===
      severity
  );
}
