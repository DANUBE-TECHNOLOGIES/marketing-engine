"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  buildPagePlan,
  buildPersistencePlan,
} = require(
  "../src/modules/minisite-blueprint-persistence"
);

function blueprintPage(
  overrides = {}
) {
  return {
    slug:
      "services",

    title:
      "Nos services",

    template:
      "services",

    blocks: [
      {
        type:
          "hero",
      },
      {
        type:
          "text",
      },
      {
        type:
          "services",
      },
      {
        type:
          "cta",
      },
    ],

    ...overrides,
  };
}

test(
  "une page absente est créée",
  () => {
    const result =
      buildPagePlan(
        blueprintPage(),
        null
      );

    assert.equal(
      result.action,
      "create-page"
    );

    assert.equal(
      result.blockActions.length,
      4
    );

    assert.ok(
      result.blockActions.every(
        (item) =>
          item.action ===
          "add-block"
      )
    );
  }
);

test(
  "les blocs existants sont conservés",
  () => {
    const result =
      buildPagePlan(
        blueprintPage(),
        {
          id:
            "page-1",

          slug:
            "services",

          title:
            "Services personnalisés",

          blocks: [
            {
              blockType:
                "hero",
            },
            {
              blockType:
                "text",
            },
          ],
        }
      );

    assert.equal(
      result.action,
      "enrich-page"
    );

    assert.equal(
      result.blockActions
        .filter(
          (item) =>
            item.action ===
            "keep"
        ).length,
      2
    );

    assert.equal(
      result.blockActions
        .filter(
          (item) =>
            item.action ===
            "add-block"
        ).length,
      2
    );
  }
);

test(
  "une page complète reste inchangée",
  () => {
    const result =
      buildPagePlan(
        blueprintPage(),
        {
          id:
            "page-1",

          slug:
            "services",

          blocks: [
            {
              blockType:
                "hero",
            },
            {
              blockType:
                "text",
            },
            {
              blockType:
                "services",
            },
            {
              blockType:
                "cta",
            },
          ],
        }
      );

    assert.equal(
      result.action,
      "keep-page"
    );

    assert.equal(
      result.blockActions
        .filter(
          (item) =>
            item.action ===
            "add-block"
        ).length,
      0
    );
  }
);

test(
  "le plan global ne remplace rien",
  () => {
    const result =
      buildPersistencePlan({
        blueprint: {
          blueprint: {
            id:
              "fram",

            version:
              "1.0.0",
          },

          site: {
            slug:
              "site-test",
          },

          pages: [
            blueprintPage(),
          ],
        },

        existingSite: {
          id:
            "site-1",

          slug:
            "site-test",

          pages: [
            {
              id:
                "page-1",

              slug:
                "services",

              blocks: [
                {
                  blockType:
                    "hero",
                },
              ],
            },
          ],
        },
      });

    assert.equal(
      result.destructive,
      false
    );

    assert.equal(
      result.overwrite,
      false
    );

    assert.equal(
      result.summary.addBlocks,
      3
    );
  }
);

test(
  "home et accueil sont considérés identiques",
  () => {
    const result =
      buildPersistencePlan({
        blueprint: {
          blueprint: {
            id:
              "fram",

            version:
              "1",
          },

          site: {
            slug:
              "site-test",
          },

          pages: [
            blueprintPage({
              slug:
                "",
            }),
          ],
        },

        existingSite: {
          pages: [
            {
              id:
                "home-1",

              slug:
                "home",

              blocks: [],
            },
          ],
        },
      });

    assert.equal(
      result.summary.createPages,
      0
    );

    assert.equal(
      result.summary.enrichPages,
      1
    );
  }
);
