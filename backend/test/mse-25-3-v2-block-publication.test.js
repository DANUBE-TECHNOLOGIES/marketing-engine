"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBlockPublication,
  normalizePageBuilderPayload,
} = require(
  "../src/modules/page-builder-persistence/payload-normalizer"
);

test(
  "MSE-25.3 publie les blocs draft et review avec une page publiée",
  () => {
    const blocks =
      normalizeBlockPublication(
        [
          { id: "draft", status: "draft" },
          { id: "review", status: "review" },
          { id: "live", status: "published" },
        ],
        true
      );

    assert.deepEqual(
      blocks.map((block) => block.status),
      ["published", "published", "published"]
    );
  }
);

test(
  "MSE-25.3 préserve les blocs masqués lors de la publication",
  () => {
    const blocks =
      normalizeBlockPublication(
        [
          { id: "hidden", status: "hidden" },
          { id: "archived", status: "archived" },
        ],
        true
      );

    assert.deepEqual(
      blocks.map((block) => block.status),
      ["hidden", "archived"]
    );
  }
);

test(
  "MSE-25.3 ne modifie pas les statuts de blocs d'une page brouillon",
  () => {
    const blocks =
      normalizeBlockPublication(
        [
          { id: "draft", status: "draft" },
          { id: "review", status: "review" },
        ],
        false
      );

    assert.deepEqual(
      blocks.map((block) => block.status),
      ["draft", "review"]
    );
  }
);

test(
  "MSE-25.3 applique la règle au payload complet V2",
  () => {
    const result =
      normalizePageBuilderPayload({
        params: {
          agencyId: "6",
          pageSlug: "home",
        },
        body: {
          page: {
            slug: "",
            title: "Accueil",
            status: "published",
          },
          blocks: [
            {
              id: "hero",
              type: "hero",
              status: "draft",
            },
            {
              id: "private",
              type: "rich_text",
              status: "hidden",
            },
          ],
        },
        existingPage: {
          slug: "",
          status: "draft",
          published: false,
        },
      });

    assert.equal(result.published, true);
    assert.equal(result.blocks[0].status, "published");
    assert.equal(result.blocks[1].status, "hidden");
  }
);
