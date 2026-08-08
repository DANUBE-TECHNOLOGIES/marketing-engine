"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

function makePage() {
  return {
    id:
      "page-1",

    title:
      "Accueil",

    slug:
      "",

    status:
      "draft",

    seoTitle:
      "Accueil SEO",

    metaDescription:
      "Description SEO",

    published:
      false,

    updatedAt:
      new Date(
        "2026-08-04T12:00:00.000Z"
      ),

    version:
      null,

    blocks:
      [],
  };
}

test(
  "constructeur objet",
  () => {
    const prisma = {};

    const service =
      new PageBuilderPersistenceService({
        prisma,

        tenantId:
          "tenant-1",
      });

    assert.equal(
      service.prisma,
      prisma
    );

    assert.equal(
      service.tenantId,
      "tenant-1"
    );
  }
);

test(
  "constructeur positionnel",
  () => {
    const prisma = {};

    const service =
      new PageBuilderPersistenceService(
        prisma,
        "tenant-legacy"
      );

    assert.equal(
      service.prisma,
      prisma
    );

    assert.equal(
      service.tenantId,
      "tenant-legacy"
    );
  }
);

test(
  "get avec contrat objet",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    service.repo = {
      async findPage(
        agencyId,
        slug
      ) {
        assert.equal(
          agencyId,
          6
        );

        assert.equal(
          slug,
          ""
        );

        return makePage();
      },
    };

    const result =
      await service.get({
        agencyId:
          6,

        pageSlug:
          "",

        tenantId:
          "tenant-1",
      });

    assert.equal(
      result.id,
      "page-1"
    );

    assert.equal(
      result.seoDescription,
      "Description SEO"
    );
  }
);

test(
  "get avec contrat positionnel",
  async () => {
    const service =
      new PageBuilderPersistenceService(
        {},
        "tenant-1"
      );

    service.repo = {
      async findPage(
        agencyId,
        slug
      ) {
        assert.equal(
          agencyId,
          6
        );

        assert.equal(
          slug,
          "contact"
        );

        return {
          ...makePage(),

          slug:
            "contact",
        };
      },
    };

    const result =
      await service.get(
        6,
        "contact"
      );

    assert.equal(
      result.slug,
      "contact"
    );
  }
);

test(
  "save avec contrat objet",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    const page =
      makePage();

    let received =
      null;

    service.repo = {
      async findPage() {
        return page;
      },

      async replacePageBlocks(
        existingPage,
        input,
        metadata
      ) {
        received = {
          existingPage,
          input,
          metadata,
        };

        return {
          ...page,

          title:
            input.page.title,
        };
      },
    };

    const result =
      await service.save({
        agencyId:
          6,

        pageSlug:
          "",

        tenantId:
          "tenant-1",

        body: {
          page: {
            title:
              "Accueil",

            slug:
              "",

            status:
              "draft",

            seoTitle:
              "Accueil SEO",

            metaDescription:
              "Description SEO",

            published:
              false,
          },

          blocks:
            [],
        },

        metadata: {
          reason:
            "test",
        },
      });

    assert.equal(
      result.title,
      "Accueil"
    );

    assert.equal(
      received
        .metadata
        .tenantId,
      "tenant-1"
    );

    assert.equal(
      received
        .metadata
        .reason,
      "test"
    );
  }
);

test(
  "PAGE_NOT_FOUND retourne 404",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    service.repo = {
      async findPage() {
        return null;
      },
    };

    await assert.rejects(
      () =>
        service.get({
          agencyId:
            6,

          pageSlug:
            "inconnue",
        }),
      (error) => {
        assert.equal(
          error.status,
          404
        );

        assert.equal(
          error.statusCode,
          404
        );

        assert.equal(
          error.code,
          "PAGE_NOT_FOUND"
        );

        return true;
      }
    );
  }
);
