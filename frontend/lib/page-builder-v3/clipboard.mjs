"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

const STORAGE_KEY =
  "mondescale-page-builder-v3-clipboard";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `block-${crypto.randomUUID()}`;
  }

  return `block-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createClipboardPayload(
  blocks,
  metadata = {}
) {
  if (
    !Array.isArray(blocks) ||
    !blocks.length
  ) {
    throw new BlockSdkError(
      "Aucun bloc à copier.",
      "CLIPBOARD_BLOCKS_REQUIRED"
    );
  }

  return {
    version: 1,
    copiedAt:
      new Date().toISOString(),
    sourcePageId:
      metadata.sourcePageId || null,
    sourceSiteId:
      metadata.sourceSiteId || null,
    blocks: blocks.map(clone),
  };
}

export function serializeClipboard(
  payload
) {
  return JSON.stringify(payload);
}

export function parseClipboard(raw) {
  if (!raw) return null;

  let payload;

  try {
    payload =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw;
  } catch {
    throw new BlockSdkError(
      "Le presse-papiers est illisible.",
      "INVALID_CLIPBOARD_PAYLOAD"
    );
  }

  if (
    payload?.version !== 1 ||
    !Array.isArray(payload.blocks)
  ) {
    throw new BlockSdkError(
      "Format de presse-papiers incompatible.",
      "INVALID_CLIPBOARD_PAYLOAD"
    );
  }

  return payload;
}

export function saveClipboard(
  payload
) {
  if (typeof window === "undefined") {
    return false;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    serializeClipboard(payload)
  );

  return true;
}

export function readClipboard() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseClipboard(
    window.localStorage.getItem(
      STORAGE_KEY
    )
  );
}

export function clearClipboard() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    STORAGE_KEY
  );
}

export function pasteClipboardBlocks(
  state,
  payload,
  options = {}
) {
  const parsed =
    parseClipboard(payload);

  if (!parsed?.blocks?.length) {
    return state;
  }

  const insertAfterId =
    options.insertAfterId ||
    state.selection?.blockIds?.at(-1) ||
    null;

  const blocks = [
    ...state.page.blocks,
  ];

  let insertionIndex =
    insertAfterId
      ? blocks.findIndex(
          (block) =>
            block.id === insertAfterId
        ) + 1
      : blocks.length;

  if (insertionIndex < 0) {
    insertionIndex =
      blocks.length;
  }

  const pasted =
    parsed.blocks.map((block) => ({
      ...clone(block),
      id:
        typeof options.createId ===
        "function"
          ? options.createId(block)
          : createId(),
    }));

  blocks.splice(
    insertionIndex,
    0,
    ...pasted
  );

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
    selection: {
      blockIds:
        pasted.map(
          (block) => block.id
        ),
      anchorId:
        pasted.at(-1)?.id || null,
    },
    dirty: true,
    revision:
      state.revision + 1,
  };
}

export function duplicateSelectedBlocks(
  state,
  options = {}
) {
  const selectedIds =
    state.selection?.blockIds || [];

  if (!selectedIds.length) {
    return state;
  }

  const selected = new Set(
    selectedIds
  );

  const sourceBlocks =
    state.page.blocks.filter(
      (block) =>
        selected.has(block.id)
    );

  const payload =
    createClipboardPayload(
      sourceBlocks,
      {
        sourcePageId:
          state.page.id,
      }
    );

  return pasteClipboardBlocks(
    state,
    payload,
    {
      ...options,
      insertAfterId:
        sourceBlocks.at(-1)?.id,
    }
  );
}
