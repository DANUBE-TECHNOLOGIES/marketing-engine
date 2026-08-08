"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

function service() {
  return new PageBuilderPersistenceService({
    prisma:
      {},
  });
}

test(
  "normalise home vers le slug vide",
  () => {
    assert.equal(
      service().normalizePageSlug(
        "home"
      ),
      ""
    );
  }
);

test(
  "normalise accueil vers le slug vide",
  () => {
    assert.equal(
      service().normalizePageSlug(
        "accueil"
      ),
      ""
    );
  }
);

test(
  "normalise les slashs de l’accueil",
  () => {
    assert.equal(
      service().normalizePageSlug(
        "/home/"
      ),
      ""
    );
  }
);

test(
  "préserve un slug interne",
  () => {
    assert.equal(
      service().normalizePageSlug(
        "/agence/"
      ),
      "agence"
    );
  }
);

test(
  "get objet recherche le slug canonique vide",
  async () => {
    const instance =
      service();

    let receivedSlug =
      null;

    instance.repo = {
      async findPage(
        agencyId,
        slug
      ) {
        assert.equal(
          agencyId,
          6
        );

        receivedSlug =
          slug;

        return {
          id:
            "page-home",

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
      },
    };

    const result =
      await instance.get({
        agencyId:
          6,

        pageSlug:
          "home",
      });

    assert.equal(
      receivedSlug,
      ""
    );

    assert.equal(
      result.slug,
      ""
    );
  }
);

test(
  "save objet recherche le slug canonique vide",
  async () => {
    const instance =
      service();

    let receivedSlug =
      null;

    const page = {
      id:
        "page-home",

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

    instance.repo = {
      async findPage(
        agencyId,
        slug
      ) {
        receivedSlug =
          slug;

        return page;
      },

      async replacePageBlocks() {
        return page;
      },
    };

    await instance.save({
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
      receivedSlug,
      ""
    );
  }
);
