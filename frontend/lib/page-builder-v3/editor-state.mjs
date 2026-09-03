import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

function normalizePositions(blocks) {
  return blocks.map((block, index) => ({
    ...block,
    position: index,
  }));
}

function assertPage(state) {
  if (!state?.page) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }
}

function assertBlock(state, blockId) {
  assertPage(state);

  const block = state.page.blocks.find(
    (item) => item.id === blockId
  );

  if (!block) {
    throw new BlockSdkError(
      `Bloc introuvable : ${blockId}.`,
      "EDITOR_BLOCK_NOT_FOUND",
      { blockId }
    );
  }

  return block;
}

export function createEditorState(
  page,
  options = {}
) {
  const blocks = Array.isArray(page?.blocks)
    ? normalizePositions(
        page.blocks.map((block) => clone(block))
      )
    : [];

  return {
    version: 1,

    page: {
      id: String(page?.id || ""),
      title: String(
        page?.title || "Nouvelle page"
      ),
      slug: String(page?.slug || ""),
      status: String(
        page?.status || "draft"
      ),
      seoTitle: String(
        page?.seoTitle || ""
      ),
      seoDescription: String(
        page?.seoDescription || ""
      ),
      blocks,
    },

    selection: {
      blockIds: options.selectedBlockId
        ? [String(options.selectedBlockId)]
        : blocks[0]?.id
          ? [String(blocks[0].id)]
          : [],
    },

    viewport: String(
      options.viewport || "desktop"
    ),

    dirty: false,
    revision: 0,
  };
}

export function selectBlock(
  state,
  blockId,
  options = {}
) {
  assertBlock(state, blockId);

  const current =
    options.append === true
      ? state.selection.blockIds
      : [];

  const selected = new Set(current);

  if (
    options.toggle === true &&
    selected.has(blockId)
  ) {
    selected.delete(blockId);
  } else {
    selected.add(blockId);
  }

  return {
    ...state,
    selection: {
      blockIds: [...selected],
    },
  };
}

export function clearSelection(state) {
  return {
    ...state,
    selection: {
      blockIds: [],
    },
  };
}

export function addBlock(
  state,
  block,
  position = undefined
) {
  assertPage(state);

  const blocks = [...state.page.blocks];

  const target = Number.isInteger(position)
    ? Math.max(
        0,
        Math.min(position, blocks.length)
      )
    : blocks.length;

  blocks.splice(target, 0, clone(block));

  const normalized =
    normalizePositions(blocks);

  return {
    ...state,

    page: {
      ...state.page,
      blocks: normalized,
    },

    selection: {
      blockIds: [block.id],
    },

    dirty: true,
    revision: state.revision + 1,
  };
}

export function updateBlock(
  state,
  blockId,
  updater
) {
  assertBlock(state, blockId);

  const blocks = state.page.blocks.map(
    (block) => {
      if (block.id !== blockId) {
        return block;
      }

      const current = clone(block);

      const next =
        typeof updater === "function"
          ? updater(current)
          : {
              ...current,
              ...clone(updater),
            };

      return {
        ...current,
        ...next,
        id: current.id,
        type: current.type,
      };
    }
  );

  return {
    ...state,

    page: {
      ...state.page,
      blocks,
    },

    dirty: true,
    revision: state.revision + 1,
  };
}

export function moveBlock(
  state,
  blockId,
  targetIndex
) {
  assertBlock(state, blockId);

  const blocks = [...state.page.blocks];

  const sourceIndex = blocks.findIndex(
    (block) => block.id === blockId
  );

  const boundedTarget = Math.max(
    0,
    Math.min(
      Number(targetIndex),
      blocks.length - 1
    )
  );

  if (sourceIndex === boundedTarget) {
    return state;
  }

  const [moved] = blocks.splice(
    sourceIndex,
    1
  );

  blocks.splice(
    boundedTarget,
    0,
    moved
  );

  return {
    ...state,

    page: {
      ...state.page,
      blocks: normalizePositions(blocks),
    },

    dirty: true,
    revision: state.revision + 1,
  };
}

export function removeBlock(
  state,
  blockId
) {
  assertBlock(state, blockId);

  const blocks = normalizePositions(
    state.page.blocks.filter(
      (block) => block.id !== blockId
    )
  );

  return {
    ...state,

    page: {
      ...state.page,
      blocks,
    },

    selection: {
      blockIds:
        state.selection.blockIds.filter(
          (id) => id !== blockId
        ),
    },

    dirty: true,
    revision: state.revision + 1,
  };
}

export function duplicateBlock(
  state,
  blockId,
  createId
) {
  const source = assertBlock(
    state,
    blockId
  );

  const sourceIndex =
    state.page.blocks.findIndex(
      (block) => block.id === blockId
    );

  const duplicated = {
    ...clone(source),
    id:
      typeof createId === "function"
        ? createId()
        : `block-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`,
  };

  return addBlock(
    state,
    duplicated,
    sourceIndex + 1
  );
}

export function setViewport(
  state,
  viewport
) {
  const normalized = String(
    viewport || ""
  );

  if (
    ![
      "desktop",
      "tablet",
      "mobile",
    ].includes(normalized)
  ) {
    throw new BlockSdkError(
      `Viewport invalide : ${normalized}.`,
      "INVALID_EDITOR_VIEWPORT"
    );
  }

  return {
    ...state,
    viewport: normalized,
  };
}

export function markSaved(state) {
  return {
    ...state,
    dirty: false,
  };
}
