import test from "node:test";
import assert from "node:assert/strict";

import {
  BlockRegistryV3,
  EditorHistory,
  addBlock,
  createCoreRegistry,
  createEditorState,
  duplicateBlock,
  moveBlock,
  removeBlock,
  selectBlock,
  updateBlock,
  validateManifest,
} from "../lib/page-builder-v3/index.mjs";

test(
  "le SDK valide un manifest",
  () => {
    const manifest = validateManifest({
      type: "hotel_cards",
      label: "Hôtels",
      category: "travel",
      defaults: {
        items: [],
      },
    });

    assert.equal(
      manifest.type,
      "hotel_cards"
    );

    assert.equal(
      manifest.capabilities.duplicable,
      true
    );
  }
);

test(
  "le registre refuse les doublons",
  () => {
    const registry =
      new BlockRegistryV3();

    registry.register({
      type: "hero",
      label: "Hero",
      category: "structure",
    });

    assert.throws(
      () =>
        registry.register({
          type: "hero",
          label: "Second Hero",
          category: "structure",
        }),
      {
        code:
          "DUPLICATE_BLOCK_MANIFEST",
      }
    );
  }
);

test(
  "le registre principal expose huit blocs",
  () => {
    const registry =
      createCoreRegistry();

    assert.equal(
      registry.list().length,
      8
    );

    assert.equal(
      registry.has("faq"),
      true
    );

    assert.equal(
      registry.get("hero").singleton,
      true
    );
  }
);

test(
  "le moteur ajoute et sélectionne un bloc",
  () => {
    const registry =
      createCoreRegistry();

    let state = createEditorState({
      id: "page-1",
      title: "Accueil",
      blocks: [],
    });

    const block =
      registry.create("hero", {
        id: "hero-1",
      });

    state = addBlock(
      state,
      block
    );

    assert.equal(
      state.page.blocks.length,
      1
    );

    assert.deepEqual(
      state.selection.blockIds,
      ["hero-1"]
    );

    assert.equal(
      state.dirty,
      true
    );
  }
);

test(
  "le moteur déplace les blocs",
  () => {
    const registry =
      createCoreRegistry();

    let state = createEditorState({
      id: "page-1",
      title: "Accueil",
      blocks: [
        registry.create("hero", {
          id: "hero",
          position: 0,
        }),
        registry.create("cta", {
          id: "cta",
          position: 1,
        }),
      ],
    });

    state = moveBlock(
      state,
      "cta",
      0
    );

    assert.deepEqual(
      state.page.blocks.map(
        (block) => block.id
      ),
      ["cta", "hero"]
    );

    assert.deepEqual(
      state.page.blocks.map(
        (block) => block.position
      ),
      [0, 1]
    );
  }
);

test(
  "le moteur met à jour un bloc",
  () => {
    const registry =
      createCoreRegistry();

    let state = createEditorState({
      id: "page-1",
      title: "Accueil",
      blocks: [
        registry.create("hero", {
          id: "hero",
        }),
      ],
    });

    state = updateBlock(
      state,
      "hero",
      (block) => ({
        ...block,
        content: {
          ...block.content,
          title: "Île Maurice",
        },
      })
    );

    assert.equal(
      state.page.blocks[0].content.title,
      "Île Maurice"
    );
  }
);

test(
  "le moteur duplique puis supprime",
  () => {
    const registry =
      createCoreRegistry();

    let state = createEditorState({
      id: "page-1",
      title: "Accueil",
      blocks: [
        registry.create("cta", {
          id: "cta-1",
        }),
      ],
    });

    state = duplicateBlock(
      state,
      "cta-1",
      () => "cta-2"
    );

    assert.equal(
      state.page.blocks.length,
      2
    );

    assert.equal(
      state.page.blocks[1].id,
      "cta-2"
    );

    state = removeBlock(
      state,
      "cta-1"
    );

    assert.deepEqual(
      state.page.blocks.map(
        (block) => block.id
      ),
      ["cta-2"]
    );
  }
);

test(
  "la sélection d’un bloc est contrôlée",
  () => {
    const registry =
      createCoreRegistry();

    const state = createEditorState({
      id: "page-1",
      title: "Accueil",
      blocks: [
        registry.create("hero", {
          id: "hero",
        }),
      ],
    });

    const selected =
      selectBlock(
        state,
        "hero"
      );

    assert.deepEqual(
      selected.selection.blockIds,
      ["hero"]
    );
  }
);

test(
  "l’historique gère undo et redo",
  () => {
    const registry =
      createCoreRegistry();

    const initial =
      createEditorState({
        id: "page-1",
        title: "Accueil",
        blocks: [],
      });

    const history =
      new EditorHistory(initial);

    const withHero = addBlock(
      initial,
      registry.create("hero", {
        id: "hero",
      })
    );

    history.commit(withHero);

    assert.equal(
      history.current().page.blocks.length,
      1
    );

    assert.equal(
      history.undo().page.blocks.length,
      0
    );

    assert.equal(
      history.redo().page.blocks.length,
      1
    );
  }
);
