"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  planAdditions,
  summarizeExecution,
} = require(
  "../src/modules/minisite-blueprint-persistence/executor"
);

test(
  "ajoute uniquement les types manquants",
  () => {
    const result =
      planAdditions(
        {
          blockActions: [
            {
              action:
                "keep",

              type:
                "hero",
            },
            {
              action:
                "add-block",

              type:
                "text",

              block: {
                type:
                  "text",

                content: {
                  title:
                    "Présentation",
                },
              },
            },
            {
              action:
                "add-block",

              type:
                "cta",

              block: {
                type:
                  "cta",
              },
            },
          ],
        },
        [
          {
            blockType:
              "hero",

            displayOrder:
              0,
          },
        ]
      );

    assert.equal(
      result.length,
      2
    );

    assert.deepEqual(
      result.map(
        (block) =>
          block.type
      ),
      [
        "text",
        "cta",
      ]
    );
  }
);

test(
  "n’ajoute pas un doublon existant",
  () => {
    const result =
      planAdditions(
        {
          blockActions: [
            {
              action:
                "add-block",

              type:
                "hero",

              block: {
                type:
                  "hero",
              },
            },
          ],
        },
        [
          {
            blockType:
              "hero",

            displayOrder:
              4,
          },
        ]
      );

    assert.equal(
      result.length,
      0
    );
  }
);

test(
  "les positions commencent après les blocs existants",
  () => {
    const result =
      planAdditions(
        {
          blockActions: [
            {
              action:
                "add-block",

              type:
                "text",

              block: {
                type:
                  "text",
              },
            },
            {
              action:
                "add-block",

              type:
                "cta",

              block: {
                type:
                  "cta",
              },
            },
          ],
        },
        [
          {
            blockType:
              "hero",

            displayOrder:
              3,
          },
        ]
      );

    assert.equal(
      result[0].position,
      4
    );

    assert.equal(
      result[1].position,
      5
    );
  }
);

test(
  "résume une exécution",
  () => {
    const result =
      summarizeExecution([
        {
          createdBlocks:
            4,
        },
        {
          createdBlocks:
            0,
        },
        {
          createdBlocks:
            2,
        },
      ]);

    assert.deepEqual(
      result,
      {
        pagesProcessed:
          3,

        pagesChanged:
          2,

        blocksCreated:
          6,

        pagesUnchanged:
          1,
      }
    );
  }
);
