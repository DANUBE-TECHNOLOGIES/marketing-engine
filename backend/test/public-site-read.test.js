"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  PublicSiteReadService,
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

test(
  "le contrat public utilise le chemin canonique /agence et reconnaît l'accueil au slug vide",
  async () => {
    const prisma = {
      agencySite: {
        async findFirst() {
          return {
            id:
              "site-1",

            agencyId:
              6,

            tenantId:
              "tenant-1",

            slug:
              "ozoir-la-ferriere",

            name:
              "Mondescale Ozoir",

            basePath:
              "/sites/ozoir-la-ferriere",

            status:
              "published",

            publishedAt:
              new Date(),

            theme:
              "mondescale-default",

            agency: {
              id:
                6,

              name:
                "Mondescale Ozoir",

              tenantId:
                "tenant-1",

              city:
                "Ozoir-la-Ferrière",

              address:
                "1 rue du Test",

              postalCode:
                "77330",

              phone:
                "0100000000",

              email:
                "ozoir@example.test",
            },

            pages: [
              {
                id:
                  "home",

                slug:
                  "",

                title:
                  "Accueil",

                status:
                  "published",

                published:
                  true,

                displayOrder:
                  0,

                blocks:
                  [],
              },
              {
                id:
                  "contact",

                slug:
                  "contact",

                title:
                  "Contact",

                status:
                  "published",

                published:
                  true,

                displayOrder:
                  10,

                blocks:
                  [],
              },
            ],
          };
        },
      },
    };

    const service =
      new PublicSiteReadService({
        prisma,
      });

    const result =
      await service.bySlug(
        "ozoir-la-ferriere"
      );

    assert.equal(
      result.homePage.id,
      "home"
    );

    assert.equal(
      result.site.basePath,
      "/agence/ozoir-la-ferriere"
    );

    assert.deepEqual(
      result.navigation.map(
        (item) => item.path
      ),
      [
        "/agence/ozoir-la-ferriere",
        "/agence/ozoir-la-ferriere/contact",
      ]
    );
  }
);
