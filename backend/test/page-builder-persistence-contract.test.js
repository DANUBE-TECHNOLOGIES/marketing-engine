"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizePageBuilderPayload,
  titleFromSlug,
} = require(
  "../src/modules/page-builder-persistence/payload-normalizer"
);

const {
  errorStatus,
} = require(
  "../src/modules/page-builder-persistence/routes"
);

test(
  "convertit home en Accueil",
  () => {
    assert.equal(
      titleFromSlug("home"),
      "Accueil"
    );
  }
);

test(
  "transforme un slug en titre",
  () => {
    assert.equal(
      titleFromSlug(
        "voyage-ile-maurice"
      ),
      "Voyage Ile Maurice"
    );
  }
);

test(
  "préserve le titre existant",
  () => {
    const result =
      normalizePageBuilderPayload({
        body: {
          blocks: [],
        },

        params: {
          agencyId: "6",
          pageSlug: "home",
        },

        existingPage: {
          title:
            "Bienvenue chez Mondescale",

          seoTitle:
            "Agence Mondescale",

          seoDescription:
            "Description existante",

          status:
            "published",
        },
      });

    assert.equal(
      result.title,
      "Bienvenue chez Mondescale"
    );

    assert.equal(
      result.seoTitle,
      "Agence Mondescale"
    );

    assert.equal(
      result.status,
      "published"
    );
  }
);

test(
  "fournit Accueil sans page existante",
  () => {
    const result =
      normalizePageBuilderPayload({
        body: {
          blocks: [],
        },

        params: {
          agencyId: "6",
          pageSlug: "home",
        },
      });

    assert.equal(
      result.title,
      "Accueil"
    );

    assert.equal(
      result.slug,
      "home"
    );

    assert.equal(
      result.agencyId,
      "6"
    );
  }
);

test(
  "normalise les positions des blocs",
  () => {
    const result =
      normalizePageBuilderPayload({
        body: {
          title:
            "Accueil",

          blocks: [
            {
              type:
                "hero",
            },

            {
              type:
                "cta",

              position:
                8,
            },
          ],
        },

        params: {
          agencyId:
            "6",

          pageSlug:
            "home",
        },
      });

    assert.equal(
      result.blocks[0]
        .position,
      0
    );

    assert.equal(
      result.blocks[1]
        .position,
      8
    );
  }
);

test(
  "classe les erreurs métier en 400",
  () => {
    assert.equal(
      errorStatus({
        code:
          "PAGE_TITLE_REQUIRED",
      }),
      400
    );
  }
);

test(
  "classe PAGE_NOT_FOUND en 404",
  () => {
    assert.equal(
      errorStatus({
        code:
          "PAGE_NOT_FOUND",
      }),
      404
    );
  }
);
