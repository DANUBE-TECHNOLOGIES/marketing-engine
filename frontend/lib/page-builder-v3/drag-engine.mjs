"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

function boundedIndex(index, length) {
  const parsed = Number(index);

  if (!Number.isInteger(parsed)) {
    throw new BlockSdkError(
      "L’index de destination doit être un entier.",
      "INVALID_DROP_INDEX",
      { index }
    );
  }

  return Math.max(
    0,
    Math.min(parsed, Math.max(0, length))
  );
}

export function normalizeBlockPositions(blocks) {
  if (!Array.isArray(blocks)) {
    throw new BlockSdkError(
      "La liste des blocs doit être un tableau.",
      "INVALID_DRAG_BLOCKS"
    );
  }

  return blocks.map((block, index) => ({
    ...clone(block),
    position: index,
  }));
}

export function calculateDropIndex({
  sourceIndex,
  targetIndex,
  position = "before",
  length,
}) {
  if (
    !Number.isInteger(sourceIndex) ||
    sourceIndex < 0 ||
    sourceIndex >= length
  ) {
    throw new BlockSdkError(
      "Index source invalide.",
      "INVALID_DRAG_SOURCE_INDEX",
      {
        sourceIndex,
        length,
      }
    );
  }

  if (
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= length
  ) {
    throw new BlockSdkError(
      "Index cible invalide.",
      "INVALID_DRAG_TARGET_INDEX",
      {
        targetIndex,
        length,
      }
    );
  }

  if (!["before", "after"].includes(position)) {
    throw new BlockSdkError(
      "La position de dépôt doit être before ou after.",
      "INVALID_DROP_POSITION",
      { position }
    );
  }

  let destination =
    position === "after"
      ? targetIndex + 1
      : targetIndex;

  /*
   * Le bloc source est retiré avant sa réinsertion.
   * Si le déplacement va vers le bas, les index suivants
   * reculent d’une position.
   */
  if (sourceIndex < destination) {
    destination -= 1;
  }

  return boundedIndex(
    destination,
    length - 1
  );
}

export function reorderBlocksByDrop(
  blocks,
  sourceId,
  targetId,
  position = "before"
) {
  if (!Array.isArray(blocks)) {
    throw new BlockSdkError(
      "La liste des blocs doit être un tableau.",
      "INVALID_DRAG_BLOCKS"
    );
  }

  const sourceIndex = blocks.findIndex(
    (block) => block.id === sourceId
  );

  const targetIndex = blocks.findIndex(
    (block) => block.id === targetId
  );

  if (sourceIndex < 0) {
    throw new BlockSdkError(
      `Bloc source introuvable : ${sourceId}.`,
      "DRAG_SOURCE_NOT_FOUND",
      { sourceId }
    );
  }

  if (targetIndex < 0) {
    throw new BlockSdkError(
      `Bloc cible introuvable : ${targetId}.`,
      "DRAG_TARGET_NOT_FOUND",
      { targetId }
    );
  }

  if (sourceId === targetId) {
    return normalizeBlockPositions(blocks);
  }

  const destination = calculateDropIndex({
    sourceIndex,
    targetIndex,
    position,
    length: blocks.length,
  });

  const reordered = blocks.map(clone);
  const [moved] = reordered.splice(
    sourceIndex,
    1
  );

  reordered.splice(
    destination,
    0,
    moved
  );

  return normalizeBlockPositions(reordered);
}

export function reorderBlocksAtIndex(
  blocks,
  sourceId,
  destinationIndex
) {
  if (!Array.isArray(blocks)) {
    throw new BlockSdkError(
      "La liste des blocs doit être un tableau.",
      "INVALID_DRAG_BLOCKS"
    );
  }

  const sourceIndex = blocks.findIndex(
    (block) => block.id === sourceId
  );

  if (sourceIndex < 0) {
    throw new BlockSdkError(
      `Bloc source introuvable : ${sourceId}.`,
      "DRAG_SOURCE_NOT_FOUND",
      { sourceId }
    );
  }

  const destination = boundedIndex(
    destinationIndex,
    blocks.length - 1
  );

  if (sourceIndex === destination) {
    return normalizeBlockPositions(blocks);
  }

  const reordered = blocks.map(clone);
  const [moved] = reordered.splice(
    sourceIndex,
    1
  );

  reordered.splice(
    destination,
    0,
    moved
  );

  return normalizeBlockPositions(reordered);
}

export function moveDirection(
  blocks,
  blockId,
  direction
) {
  const index = blocks.findIndex(
    (block) => block.id === blockId
  );

  if (index < 0) {
    throw new BlockSdkError(
      `Bloc introuvable : ${blockId}.`,
      "DRAG_SOURCE_NOT_FOUND",
      { blockId }
    );
  }

  if (![-1, 1].includes(direction)) {
    throw new BlockSdkError(
      "La direction doit être -1 ou 1.",
      "INVALID_MOVE_DIRECTION",
      { direction }
    );
  }

  return reorderBlocksAtIndex(
    blocks,
    blockId,
    index + direction
  );
}
