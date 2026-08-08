"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  publicationPlanSnapshot,
  publicationPlanToken,
} =
  require(
    "../src/modules/site-publication/service"
  );

function fixture() {
  return {
    site: {
      id:
        "site-1",

      slug:
        "site-test",

      status:
        "draft",

      publishedAt:
        null,

      pages: [
        {
          id:
            "page-1",

          slug:
            "accueil",

          status:
            "draft",

          published:
            false,

          updatedAt:
            new Date(
              "2026-08-06T12:00:00.000Z"
            ),
        },

        {
          id:
            "page-2",

          slug:
            "contact",

          status:
            "published",

          published:
            true,

          updatedAt:
            new Date(
              "2026-08-06T12:01:00.000Z"
            ),
        },
      ],
    },

    readiness: {
      score:
        100,

      summary: {
        missing:
          0,
      },

      checks:
        [],
    },
  };
}

test(
  "le jeton est stable pour un même état",
  () => {
    const first =
      fixture();

    const second =
      fixture();

    assert.equal(
      publicationPlanToken(
        first
      ),
      publicationPlanToken(
        second
      )
    );
  }
);

test(
  "le jeton change lorsque le statut d’une page change",
  () => {
    const first =
      fixture();

    const second =
      fixture();

    second.site.pages[0]
      .published =
      true;

    second.site.pages[0]
      .status =
      "published";

    assert.notEqual(
      publicationPlanToken(
        first
      ),
      publicationPlanToken(
        second
      )
    );
  }
);

test(
  "le jeton change lorsque le Readiness change",
  () => {
    const first =
      fixture();

    const second =
      fixture();

    second.readiness.score =
      90;

    second.readiness.summary
      .missing =
      1;

    second.readiness.checks = [
      {
        id:
          "logo",

        required:
          true,

        ready:
          false,
      },
    ];

    assert.notEqual(
      publicationPlanToken(
        first
      ),
      publicationPlanToken(
        second
      )
    );
  }
);

test(
  "le snapshot ne contient que les données utiles",
  () => {
    const snapshot =
      publicationPlanSnapshot(
        fixture()
      );

    assert.equal(
      snapshot.site.id,
      "site-1"
    );

    assert.equal(
      snapshot.readiness.score,
      100
    );

    assert.equal(
      snapshot.pages.length,
      2
    );

    assert.equal(
      snapshot.pages[0].slug,
      "accueil"
    );
  }
);
