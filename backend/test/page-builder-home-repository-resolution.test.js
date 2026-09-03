"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

function homePage() {
  return {
    id:
      "home-page-id",

    title:
      "Accueil",

    slug:
      "",

    status:
      "published",

    seoTitle:
      "Accueil",

    metaDescription:
      "Description",

    published:
      true,

    updatedAt:
      new Date(),

    version:
      null,

    blocks:
      [],
  };
}

test(
  "get home utilise findHomePage",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    let homeCalled =
      0;

    let standardCalled =
      0;

    service.repo = {
      async findHomePage(
        agencyId
      ) {
        assert.equal(
          agencyId,
          6
        );

        homeCalled += 1;

        return homePage();
      },

      async findPage() {
        standardCalled += 1;
        return null;
      },
    };

    const result =
      await service.get({
        agencyId:
          6,

        pageSlug:
          "home",
      });

    assert.equal(
      homeCalled,
      1
    );

    assert.equal(
      standardCalled,
      0
    );

    assert.equal(
      result.slug,
      ""
    );
  }
);

test(
  "get agence continue d’utiliser findPage",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    let receivedSlug =
      null;

    service.repo = {
      async findHomePage() {
        throw new Error(
          "findHomePage ne doit pas être appelé"
        );
      },

      async findPage(
        agencyId,
        slug
      ) {
        receivedSlug =
          slug;

        return {
          ...homePage(),

          slug:
            "agence",

          title:
            "Notre agence",
        };
      },
    };

    const result =
      await service.get({
        agencyId:
          6,

        pageSlug:
          "agence",
      });

    assert.equal(
      receivedSlug,
      "agence"
    );

    assert.equal(
      result.slug,
      "agence"
    );
  }
);

test(
  "save home utilise la résolution canonique",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    let homeCalled =
      0;

    service.repo = {
      async findHomePage() {
        homeCalled += 1;
        return homePage();
      },

      async findPage() {
        throw new Error(
          "findPage ne doit pas être appelé pour home"
        );
      },

      async replacePageBlocks(
        page
      ) {
        return page;
      },
    };

    await service.save({
      agencyId:
        6,

      pageSlug:
        "home",

      body: {
        page: {
          title:
            "Accueil",

          slug:
            "",

          status:
            "published",

          seoTitle:
            "Accueil",

          metaDescription:
            "Description",

          published:
            true,
        },

        blocks:
          [],
      },
    });

    assert.equal(
      homeCalled,
      1
    );
  }
);
