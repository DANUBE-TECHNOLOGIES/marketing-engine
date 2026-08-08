"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          stableValue(value[key]),
        ])
    );
  }

  return value;
}

export function stableJson(value) {
  return JSON.stringify(
    stableValue(value)
  );
}

export function normalizeVersionSnapshot(
  version
) {
  const source =
    version?.snapshot ||
    version?.page ||
    version?.data ||
    {};

  const blocks =
    Array.isArray(source.blocks)
      ? source.blocks
      : Array.isArray(
          source.sections
        )
        ? source.sections
        : [];

  return {
    id:
      source.id ||
      version?.pageId ||
      null,

    title:
      source.title || "",

    slug:
      source.slug || "",

    status:
      source.status || "draft",

    seoTitle:
      source.seoTitle || "",

    seoDescription:
      source.seoDescription ||
      source.metaDescription ||
      "",

    blocks: blocks
      .map((block, index) => ({
        id:
          block.id ||
          `snapshot-${index}`,

        type:
          block.type ||
          block.blockType ||
          block.sectionType ||
          "rich_text",

        status:
          block.status ||
          "draft",

        position:
          Number(
            block.position ??
            block.displayOrder ??
            index
          ),

        content:
          clone(
            block.content ||
            block.jsonContent ||
            {}
          ),

        settings:
          clone(
            block.settings || {}
          ),

        visibleDesktop:
          block.visibleDesktop !==
          false,

        visibleMobile:
          block.visibleMobile !==
          false,
      }))
      .sort(
        (left, right) =>
          left.position -
          right.position
      ),
  };
}

export function comparePageVersions(
  currentPage,
  targetSnapshot
) {
  if (!currentPage) {
    throw new BlockSdkError(
      "La page actuelle est absente.",
      "VERSION_CURRENT_PAGE_REQUIRED"
    );
  }

  const target =
    normalizeVersionSnapshot({
      snapshot: targetSnapshot,
    });

  const current =
    normalizeVersionSnapshot({
      snapshot: currentPage,
    });

  const currentById = new Map(
    current.blocks.map(
      (block) => [
        block.id,
        block,
      ]
    )
  );

  const targetById = new Map(
    target.blocks.map(
      (block) => [
        block.id,
        block,
      ]
    )
  );

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  for (
    const targetBlock
    of target.blocks
  ) {
    const currentBlock =
      currentById.get(
        targetBlock.id
      );

    if (!currentBlock) {
      added.push(targetBlock);
      continue;
    }

    if (
      stableJson(currentBlock) !==
      stableJson(targetBlock)
    ) {
      modified.push({
        current: currentBlock,
        target: targetBlock,
      });
    } else {
      unchanged.push(targetBlock);
    }
  }

  for (
    const currentBlock
    of current.blocks
  ) {
    if (
      !targetById.has(
        currentBlock.id
      )
    ) {
      removed.push(currentBlock);
    }
  }

  const pageFields = [
    "title",
    "slug",
    "status",
    "seoTitle",
    "seoDescription",
  ];

  const metadata = pageFields
    .filter(
      (field) =>
        current[field] !==
        target[field]
    )
    .map((field) => ({
      field,
      current:
        current[field],
      target:
        target[field],
    }));

  return {
    changed:
      added.length > 0 ||
      removed.length > 0 ||
      modified.length > 0 ||
      metadata.length > 0,

    added,
    removed,
    modified,
    unchanged,
    metadata,

    summary: {
      added:
        added.length,
      removed:
        removed.length,
      modified:
        modified.length,
      unchanged:
        unchanged.length,
      metadata:
        metadata.length,
    },
  };
}

export function normalizeVersionItem(
  version,
  index = 0
) {
  const snapshot =
    normalizeVersionSnapshot(
      version
    );

  return {
    id:
      String(
        version?.id ||
        version?.versionId ||
        `version-${index}`
      ),

    version:
      Number(
        version?.version ??
        version?.number ??
        index + 1
      ),

    reason:
      String(
        version?.reason ||
        version?.label ||
        "Sauvegarde"
      ),

    createdBy:
      version?.createdBy ||
      version?.author ||
      null,

    createdAt:
      version?.createdAt ||
      version?.date ||
      null,

    snapshot,
  };
}

export function classifyVersionReason(
  reason
) {
  const value = String(
    reason || ""
  ).toLowerCase();

  if (
    value.includes("rollback") ||
    value.includes("restaur")
  ) {
    return "rollback";
  }

  if (
    value.includes("publish") ||
    value.includes("publication")
  ) {
    return "publication";
  }

  if (
    value.includes("auto")
  ) {
    return "autosave";
  }

  return "save";
}
