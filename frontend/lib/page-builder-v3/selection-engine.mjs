"use strict";

import {
  BlockSdkError,
} from "./sdk/index.mjs";

function blockIds(state) {
  if (!state?.page?.blocks) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  return state.page.blocks.map(
    (block) => block.id
  );
}

function assertKnownIds(state, ids) {
  const available = new Set(
    blockIds(state)
  );

  for (const id of ids) {
    if (!available.has(id)) {
      throw new BlockSdkError(
        `Bloc introuvable : ${id}.`,
        "EDITOR_BLOCK_NOT_FOUND",
        { blockId: id }
      );
    }
  }
}

export function uniqueIds(ids = []) {
  return [
    ...new Set(
      ids
        .filter(Boolean)
        .map(String)
    ),
  ];
}

export function replaceSelection(
  state,
  ids
) {
  const normalized = uniqueIds(ids);

  assertKnownIds(
    state,
    normalized
  );

  return {
    ...state,
    selection: {
      blockIds: normalized,
      anchorId:
        normalized.at(-1) || null,
    },
  };
}

export function toggleSelection(
  state,
  blockId
) {
  assertKnownIds(
    state,
    [blockId]
  );

  const selected = new Set(
    state.selection?.blockIds || []
  );

  if (selected.has(blockId)) {
    selected.delete(blockId);
  } else {
    selected.add(blockId);
  }

  return {
    ...state,
    selection: {
      blockIds: [...selected],
      anchorId: blockId,
    },
  };
}

export function appendSelection(
  state,
  blockId
) {
  assertKnownIds(
    state,
    [blockId]
  );

  return {
    ...state,
    selection: {
      blockIds: uniqueIds([
        ...(state.selection?.blockIds || []),
        blockId,
      ]),
      anchorId: blockId,
    },
  };
}

export function selectRange(
  state,
  targetId
) {
  const ids = blockIds(state);

  assertKnownIds(
    state,
    [targetId]
  );

  const anchorId =
    state.selection?.anchorId ||
    state.selection?.blockIds?.at(-1) ||
    targetId;

  const anchorIndex =
    ids.indexOf(anchorId);

  const targetIndex =
    ids.indexOf(targetId);

  const from = Math.min(
    anchorIndex,
    targetIndex
  );

  const to = Math.max(
    anchorIndex,
    targetIndex
  );

  return {
    ...state,
    selection: {
      blockIds: ids.slice(
        from,
        to + 1
      ),
      anchorId,
    },
  };
}

export function selectAllBlocks(state) {
  const ids = blockIds(state);

  return {
    ...state,
    selection: {
      blockIds: ids,
      anchorId:
        ids.at(-1) || null,
    },
  };
}

export function clearBlockSelection(state) {
  return {
    ...state,
    selection: {
      blockIds: [],
      anchorId: null,
    },
  };
}

export function selectedBlocks(state) {
  const selected = new Set(
    state.selection?.blockIds || []
  );

  return state.page.blocks.filter(
    (block) =>
      selected.has(block.id)
  );
}

export function removeSelectedBlocks(state) {
  const selected = new Set(
    state.selection?.blockIds || []
  );

  if (!selected.size) {
    return state;
  }

  const blocks = state.page.blocks
    .filter(
      (block) =>
        !selected.has(block.id)
    )
    .map((block, index) => ({
      ...block,
      position: index,
    }));

  return {
    ...state,
    page: {
      ...state.page,
      blocks,
    },
    selection: {
      blockIds: [],
      anchorId: null,
    },
    dirty: true,
    revision:
      state.revision + 1,
  };
}

export function moveSelectedBlocks(
  state,
  direction
) {
  if (![-1, 1].includes(direction)) {
    throw new BlockSdkError(
      "La direction doit être -1 ou 1.",
      "INVALID_MOVE_DIRECTION",
      { direction }
    );
  }

  const selected = new Set(
    state.selection?.blockIds || []
  );

  if (!selected.size) {
    return state;
  }

  const blocks = [
    ...state.page.blocks,
  ];

  if (direction === -1) {
    for (
      let index = 1;
      index < blocks.length;
      index += 1
    ) {
      if (
        selected.has(blocks[index].id) &&
        !selected.has(
          blocks[index - 1].id
        )
      ) {
        [
          blocks[index - 1],
          blocks[index],
        ] = [
          blocks[index],
          blocks[index - 1],
        ];
      }
    }
  } else {
    for (
      let index = blocks.length - 2;
      index >= 0;
      index -= 1
    ) {
      if (
        selected.has(blocks[index].id) &&
        !selected.has(
          blocks[index + 1].id
        )
      ) {
        [
          blocks[index],
          blocks[index + 1],
        ] = [
          blocks[index + 1],
          blocks[index],
        ];
      }
    }
  }

  return {
    ...state,
    page: {
      ...state.page,
      blocks: blocks.map(
        (block, index) => ({
          ...block,
          position: index,
        })
      ),
    },
    dirty: true,
    revision:
      state.revision + 1,
  };
}
