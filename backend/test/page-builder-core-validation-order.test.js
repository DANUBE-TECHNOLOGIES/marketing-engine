"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PageBuilderPersistenceService =
  require(
    "../src/modules/page-builder-persistence/service"
  );

function legacyCtaPage() {
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

    blocks: [
      {
        id:
          "cta-1",

        blockType:
          "cta",

        status:
          "published",

        displayOrder:
          0,

        content: {
          title:
            "Préparons votre voyage",

          text:
            "Parlez-nous de votre projet.",

          style:
            "primary",
        },

        settings:
          {},

        seo:
          {},

        visibleDesktop:
          true,

        visibleMobile:
          true,

        version:
          1,
      },
    ],
  };
}

test(
  "migre le CTA avant la validation historique",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    const existingPage =
      legacyCtaPage();

    let persistedPayload =
      null;

    service.repo = {
      async findPage() {
        return existingPage;
      },

      async replacePageBlocks(
        page,
        payload
      ) {
        persistedPayload =
          payload;

        return {
          ...existingPage,

          blocks:
            payload.blocks.map(
              (
                block,
                index
              ) => ({
                id:
                  block.id,

                blockType:
                  block.type,

                status:
                  block.status,

                displayOrder:
                  index,

                content:
                  block.content,

                settings:
                  block.settings,

                seo:
                  block.seo,

                visibleDesktop:
                  block.visibleDesktop,

                visibleMobile:
                  block.visibleMobile,

                version:
                  block.version,
              })
            ),
        };
      },
    };

    const result =
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

          blocks: [
            {
              id:
                "cta-1",

              type:
                "cta",

              status:
                "published",

              position:
                0,

              content: {
                title:
                  "Préparons votre voyage",

                text:
                  "Parlez-nous de votre projet.",

                style:
                  "primary",
              },

              settings:
                {},

              seo:
                {},

              visibleDesktop:
                true,

              visibleMobile:
                true,

              version:
                1,
            },
          ],
        },
      });

    assert.equal(
      persistedPayload
        .blocks[0]
        .content
        .primaryCta
        .label,
      "Demander un devis"
    );

    assert.equal(
      persistedPayload
        .blocks[0]
        .content
        .primaryCta
        .href,
      "#contact"
    );

    assert.equal(
      result.blocks[0]
        .content
        .primaryCta
        .label,
      "Demander un devis"
    );
  }
);

test(
  "un type inconnu reste refusé",
  async () => {
    const service =
      new PageBuilderPersistenceService({
        prisma:
          {},
      });

    service.repo = {
      async findPage() {
        return legacyCtaPage();
      },
    };

    await assert.rejects(
      () =>
        service.save({
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

            blocks: [
              {
                type:
                  "unknown-block",

                content:
                  {},
              },
            ],
          },
        }),
      (error) => {
        assert.equal(
          error.code,
          "UNKNOWN_BLOCK_TYPE"
        );

        return true;
      }
    );
  }
);
