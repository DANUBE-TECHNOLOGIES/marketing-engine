"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDropIndex,
  moveDirection,
  normalizeBlockPositions,
  reorderBlocksAtIndex,
  reorderBlocksByDrop,
} from "../lib/page-builder-v3/index.mjs";

const blocks = [
  {
    id: "hero",
    type: "hero",
    position: 0,
  },
  {
    id: "text",
    type: "rich_text",
    position: 1,
  },
  {
    id: "faq",
    type: "faq",
    position: 2,
  },
  {
    id: "cta",
    type: "cta",
    position: 3,
  },
];

test(
  "normalise toutes les positions",
  () => {
    const result =
      normalizeBlockPositions([
        {
          id: "a",
          position: 8,
        },
        {
          id: "b",
          position: 2,
        },
      ]);

    assert.deepEqual(
      result.map(
        (block) => block.position
      ),
      [0, 1]
    );
  }
);

test(
  "calcule un dépôt vers le haut",
  () => {
    assert.equal(
      calculateDropIndex({
        sourceIndex: 3,
        targetIndex: 1,
        position: "before",
        length: 4,
      }),
      1
    );
  }
);

test(
  "calcule un dépôt vers le bas",
  () => {
    assert.equal(
      calculateDropIndex({
        sourceIndex: 0,
        targetIndex: 2,
        position: "after",
        length: 4,
      }),
      2
    );
  }
);

test(
  "déplace CTA avant le texte",
  () => {
    const result =
      reorderBlocksByDrop(
        blocks,
        "cta",
        "text",
        "before"
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      [
        "hero",
        "cta",
        "text",
        "faq",
      ]
    );

    assert.deepEqual(
      result.map(
        (block) => block.position
      ),
      [0, 1, 2, 3]
    );
  }
);

test(
  "déplace Hero après FAQ",
  () => {
    const result =
      reorderBlocksByDrop(
        blocks,
        "hero",
        "faq",
        "after"
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      [
        "text",
        "faq",
        "hero",
        "cta",
      ]
    );
  }
);

test(
  "déplace un bloc à un index précis",
  () => {
    const result =
      reorderBlocksAtIndex(
        blocks,
        "faq",
        0
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      [
        "faq",
        "hero",
        "text",
        "cta",
      ]
    );
  }
);

test(
  "déplacement directionnel clavier",
  () => {
    const result =
      moveDirection(
        blocks,
        "faq",
        -1
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      [
        "hero",
        "faq",
        "text",
        "cta",
      ]
    );
  }
);

test(
  "un dépôt sur soi-même ne change rien",
  () => {
    const result =
      reorderBlocksByDrop(
        blocks,
        "faq",
        "faq",
        "before"
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      blocks.map(
        (block) => block.id
      )
    );
  }
);

test(
  "refuse un bloc source absent",
  () => {
    assert.throws(
      () =>
        reorderBlocksByDrop(
          blocks,
          "missing",
          "faq",
          "before"
        ),
      {
        code:
          "DRAG_SOURCE_NOT_FOUND",
      }
    );
  }
);
