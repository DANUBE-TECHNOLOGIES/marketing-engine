"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  appendSelection,
  clearBlockSelection,
  createClipboardPayload,
  createEditorState,
  duplicateSelectedBlocks,
  moveSelectedBlocks,
  parseClipboard,
  pasteClipboardBlocks,
  removeSelectedBlocks,
  replaceSelection,
  selectAllBlocks,
  selectRange,
  selectedBlocks,
  toggleSelection,
} from "../lib/page-builder-v3/index.mjs";

function state() {
  return createEditorState({
    id: "page-1",
    title: "Accueil",
    blocks: [
      {
        id: "hero",
        type: "hero",
        position: 0,
        content: {},
      },
      {
        id: "text",
        type: "rich_text",
        position: 1,
        content: {},
      },
      {
        id: "faq",
        type: "faq",
        position: 2,
        content: {},
      },
      {
        id: "cta",
        type: "cta",
        position: 3,
        content: {},
      },
    ],
  });
}

test(
  "remplace la sélection",
  () => {
    const result =
      replaceSelection(
        state(),
        ["text", "faq"]
      );

    assert.deepEqual(
      result.selection.blockIds,
      ["text", "faq"]
    );
  }
);

test(
  "ajoute et retire par toggle",
  () => {
    let result =
      toggleSelection(
        state(),
        "faq"
      );

    assert.ok(
      result.selection.blockIds.includes(
        "faq"
      )
    );

    result =
      toggleSelection(
        result,
        "faq"
      );

    assert.equal(
      result.selection.blockIds.includes(
        "faq"
      ),
      false
    );
  }
);

test(
  "sélectionne une plage",
  () => {
    let result =
      replaceSelection(
        state(),
        ["text"]
      );

    result =
      selectRange(
        result,
        "cta"
      );

    assert.deepEqual(
      result.selection.blockIds,
      ["text", "faq", "cta"]
    );
  }
);

test(
  "sélectionne tous les blocs",
  () => {
    const result =
      selectAllBlocks(
        state()
      );

    assert.equal(
      result.selection.blockIds.length,
      4
    );
  }
);

test(
  "retourne les blocs sélectionnés dans l’ordre",
  () => {
    const initial =
      replaceSelection(
        state(),
        ["cta", "text"]
      );

    assert.deepEqual(
      selectedBlocks(initial).map(
        (block) => block.id
      ),
      ["text", "cta"]
    );
  }
);

test(
  "supprime les blocs sélectionnés",
  () => {
    const initial =
      replaceSelection(
        state(),
        ["text", "faq"]
      );

    const result =
      removeSelectedBlocks(
        initial
      );

    assert.deepEqual(
      result.page.blocks.map(
        (block) => block.id
      ),
      ["hero", "cta"]
    );

    assert.deepEqual(
      result.page.blocks.map(
        (block) => block.position
      ),
      [0, 1]
    );
  }
);

test(
  "déplace un groupe vers le haut",
  () => {
    const initial =
      replaceSelection(
        state(),
        ["faq", "cta"]
      );

    const result =
      moveSelectedBlocks(
        initial,
        -1
      );

    assert.deepEqual(
      result.page.blocks.map(
        (block) => block.id
      ),
      [
        "hero",
        "faq",
        "cta",
        "text",
      ]
    );
  }
);

test(
  "crée et relit un presse-papiers",
  () => {
    const payload =
      createClipboardPayload([
        {
          id: "faq",
          type: "faq",
          content: {},
        },
      ]);

    const parsed =
      parseClipboard(
        JSON.stringify(payload)
      );

    assert.equal(
      parsed.blocks.length,
      1
    );

    assert.equal(
      parsed.blocks[0].type,
      "faq"
    );
  }
);

test(
  "colle après la sélection",
  () => {
    const initial =
      replaceSelection(
        state(),
        ["text"]
      );

    const payload =
      createClipboardPayload([
        {
          id: "old-faq",
          type: "faq",
          content: {
            title: "FAQ copiée",
          },
        },
      ]);

    const result =
      pasteClipboardBlocks(
        initial,
        payload,
        {
          createId: () =>
            "new-faq",
        }
      );

    assert.deepEqual(
      result.page.blocks.map(
        (block) => block.id
      ),
      [
        "hero",
        "text",
        "new-faq",
        "faq",
        "cta",
      ]
    );

    assert.deepEqual(
      result.selection.blockIds,
      ["new-faq"]
    );
  }
);

test(
  "duplique plusieurs blocs",
  () => {
    const initial =
      replaceSelection(
        state(),
        ["text", "faq"]
      );

    let sequence = 0;

    const result =
      duplicateSelectedBlocks(
        initial,
        {
          createId: () =>
            `copy-${++sequence}`,
        }
      );

    assert.deepEqual(
      result.page.blocks.map(
        (block) => block.id
      ),
      [
        "hero",
        "text",
        "faq",
        "copy-1",
        "copy-2",
        "cta",
      ]
    );
  }
);

test(
  "efface la sélection",
  () => {
    const initial =
      selectAllBlocks(
        state()
      );

    const result =
      clearBlockSelection(
        initial
      );

    assert.deepEqual(
      result.selection.blockIds,
      []
    );
  }
);
