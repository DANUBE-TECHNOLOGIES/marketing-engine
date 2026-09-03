"use strict";

function cleanText(
  value,
  fallback = ""
) {
  return String(
    value ?? fallback
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeType(
  value
) {
  return cleanText(
    value
  ).toLowerCase();
}

function planAdditions(
  pagePlan,
  existingBlocks = []
) {
  const existingTypes =
    new Set(
      existingBlocks
        .map(
          (block) =>
            normalizeType(
              block.blockType ||
              block.type
            )
        )
        .filter(Boolean)
    );

  let nextPosition =
    existingBlocks.reduce(
      (
        maximum,
        block
      ) =>
        Math.max(
          maximum,
          Number(
            block.displayOrder ??
            block.position ??
            -1
          )
        ),
      -1
    ) + 1;

  const additions = [];

  for (
    const action
    of pagePlan.blockActions || []
  ) {
    if (
      action.action !==
      "add-block"
    ) {
      continue;
    }

    const type =
      normalizeType(
        action.type ||
        action.block?.type
      );

    if (
      !type ||
      existingTypes.has(type)
    ) {
      continue;
    }

    additions.push({
      ...action.block,

      type,

      position:
        nextPosition,
    });

    existingTypes.add(type);
    nextPosition += 1;
  }

  return additions;
}

function summarizeExecution(
  items
) {
  return {
    pagesProcessed:
      items.length,

    pagesChanged:
      items.filter(
        (item) =>
          item.createdBlocks >
          0
      ).length,

    blocksCreated:
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.createdBlocks,
        0
      ),

    pagesUnchanged:
      items.filter(
        (item) =>
          item.createdBlocks ===
          0
      ).length,
  };
}

module.exports = {
  normalizeType,
  planAdditions,
  summarizeExecution,
};
