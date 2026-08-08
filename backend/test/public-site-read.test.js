"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeSlug,
  publishedLike,
  normalizeBlock,
  normalizePage,
} = require(
  "../src/modules/public-site-read"
);

test(
  "normalise un slug",
  () => {
    assert.equal(
      normalizeSlug(
        "/agence-test/"
      ),
      "agence-test"
    );
  }
);

test(
  "reconnaît un statut publié",
  () => {
    assert.equal(
      publishedLike({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      publishedLike({
        status:
          "draft",
      }),
      false
    );
  }
);

test(
  "normalise un bloc",
  () => {
    const result =
      normalizeBlock({
        id:
          "b1",

        blockType:
          "hero",

        content: {
          title:
            "Voyage",
        },

        displayOrder:
          1,
      });

    assert.equal(
      result.type,
      "hero"
    );

    assert.equal(
      result.content.title,
      "Voyage"
    );
  }
);

test(
  "normalise une page",
  () => {
    const result =
      normalizePage({
        id:
          "p1",

        slug:
          "accueil",

        title:
          "Accueil",

        status:
          "published",

        blocks:
          [],
      });

    assert.equal(
      result.published,
      true
    );

    assert.equal(
      result.slug,
      "accueil"
    );
  }
);
