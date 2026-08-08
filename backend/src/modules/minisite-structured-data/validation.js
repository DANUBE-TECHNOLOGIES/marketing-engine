"use strict";

function validateGraph(
  graph = []
) {
  const issues = [];
  const identifiers =
    new Map();

  for (
    const node
    of graph
  ) {
    const type =
      Array.isArray(
        node?.["@type"]
      )
        ? node["@type"].join(",")
        : node?.["@type"];

    if (!type) {
      issues.push({
        level:
          "FAIL",

        code:
          "SCHEMA_TYPE_MISSING",

        node,
      });
    }

    const id =
      node?.["@id"];

    if (!id) {
      issues.push({
        level:
          "FAIL",

        code:
          "SCHEMA_ID_MISSING",

        type:
          type || null,
      });

      continue;
    }

    identifiers.set(
      id,
      (
        identifiers.get(id) ||
        0
      ) + 1
    );

    if (
      (
        type ===
          "TravelAgency" ||
        (
          Array.isArray(
            node?.["@type"]
          ) &&
          node["@type"]
            .includes(
              "TravelAgency"
            )
        )
      ) &&
      !node.name
    ) {
      issues.push({
        level:
          "FAIL",

        code:
          "TRAVEL_AGENCY_NAME_MISSING",

        id,
      });
    }

    if (
      type ===
        "BreadcrumbList" &&
      !Array.isArray(
        node.itemListElement
      )
    ) {
      issues.push({
        level:
          "FAIL",

        code:
          "BREADCRUMB_ITEMS_MISSING",

        id,
      });
    }

    if (
      type ===
        "FAQPage" &&
      !Array.isArray(
        node.mainEntity
      )
    ) {
      issues.push({
        level:
          "FAIL",

        code:
          "FAQ_ENTITIES_MISSING",

        id,
      });
    }
  }

  for (
    const [
      id,
      count,
    ]
    of identifiers
  ) {
    if (count > 1) {
      issues.push({
        level:
          "FAIL",

        code:
          "SCHEMA_ID_DUPLICATED",

        id,

        count,
      });
    }
  }

  return {
    valid:
      issues.filter(
        (issue) =>
          issue.level ===
          "FAIL"
      ).length === 0,

    issues,
  };
}

module.exports = {
  validateGraph,
};
