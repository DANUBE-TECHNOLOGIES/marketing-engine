"use strict";

const PageBuilderPersistenceRepository =
  require("./repository");

const {
  validatePagePayload,
} = require("./validation");

const {
  validateAndMigratePagePayload,
} = require("./core-payload-adapter");

class PageBuilderPersistenceService {
  constructor(
    prismaOrOptions,
    tenantId = null
  ) {
    const options =
      prismaOrOptions &&
      typeof prismaOrOptions ===
        "object" &&
      Object.prototype
        .hasOwnProperty
        .call(
          prismaOrOptions,
          "prisma"
        )
        ? prismaOrOptions
        : {
            prisma:
              prismaOrOptions,

            tenantId,
          };

    if (!options.prisma) {
      throw new TypeError(
        "Prisma est obligatoire pour PageBuilderPersistenceService."
      );
    }

    this.prisma =
      options.prisma;

    this.tenantId =
      options.tenantId ||
      tenantId ||
      null;

    this.repo =
      new PageBuilderPersistenceRepository(
        this.prisma,
        this.tenantId
      );
  }

  notFound(
    message,
    code
  ) {
    return Object.assign(
      new Error(message),
      {
        status:
          404,

        statusCode:
          404,

        code,
      }
    );
  }

  normalizePageSlug(
    value
  ) {
    const normalized =
      String(
        value ?? ""
      )
        .trim()
        .replace(
          /^\/+|\/+$/g,
          ""
        );

    if (
      normalized === "home" ||
      normalized === "accueil"
    ) {
      return "";
    }

    return normalized;
  }

  normalizeReadArguments(
    agencyIdOrInput,
    slug = ""
  ) {
    if (
      agencyIdOrInput &&
      typeof agencyIdOrInput ===
        "object" &&
      !Array.isArray(
        agencyIdOrInput
      )
    ) {
      return {
        agencyId:
          agencyIdOrInput
            .agencyId,

        slug:
          this.normalizePageSlug(
            agencyIdOrInput
              .pageSlug ??
            agencyIdOrInput
              .slug ??
            ""
          ),

        tenantId:
          agencyIdOrInput
            .tenantId ??
          this.tenantId ??
          null,
      };
    }

    return {
      agencyId:
        agencyIdOrInput,

      slug:
        this.normalizePageSlug(
          slug
        ),

      tenantId:
        this.tenantId ??
        null,
    };
  }

  normalizeSaveArguments(
    agencyIdOrInput,
    slug = "",
    body = {},
    metadata = {}
  ) {
    if (
      agencyIdOrInput &&
      typeof agencyIdOrInput ===
        "object" &&
      !Array.isArray(
        agencyIdOrInput
      )
    ) {
      return {
        agencyId:
          agencyIdOrInput
            .agencyId,

        slug:
          this.normalizePageSlug(
            agencyIdOrInput
              .pageSlug ??
            agencyIdOrInput
              .slug ??
            ""
          ),

        body:
          agencyIdOrInput
            .body ??
          agencyIdOrInput
            .payload ??
          {},

        metadata: {
          ...(
            agencyIdOrInput
              .metadata ||
            {}
          ),

          tenantId:
            agencyIdOrInput
              .tenantId ??
            agencyIdOrInput
              .metadata
              ?.tenantId ??
            this.tenantId ??
            null,
        },
      };
    }

    return {
      agencyId:
        agencyIdOrInput,

      slug:
        this.normalizePageSlug(
          slug
        ),

      body:
        body || {},

      metadata: {
        ...(metadata || {}),

        tenantId:
          metadata
            ?.tenantId ??
          this.tenantId ??
          null,
      },
    };
  }

  normalizeRollbackArguments(
    agencyIdOrInput,
    slug,
    versionId,
    metadata = {}
  ) {
    if (
      agencyIdOrInput &&
      typeof agencyIdOrInput ===
        "object" &&
      !Array.isArray(
        agencyIdOrInput
      )
    ) {
      return {
        agencyId:
          agencyIdOrInput
            .agencyId,

        slug:
          this.normalizePageSlug(
            agencyIdOrInput
              .pageSlug ??
            agencyIdOrInput
              .slug ??
            ""
          ),

        versionId:
          agencyIdOrInput
            .versionId,

        metadata: {
          ...(
            agencyIdOrInput
              .metadata ||
            {}
          ),

          tenantId:
            agencyIdOrInput
              .tenantId ??
            agencyIdOrInput
              .metadata
              ?.tenantId ??
            this.tenantId ??
            null,
        },
      };
    }

    return {
      agencyId:
        agencyIdOrInput,

      slug:
        this.normalizePageSlug(
          slug
        ),

      versionId,

      metadata: {
        ...(metadata || {}),

        tenantId:
          metadata
            ?.tenantId ??
          this.tenantId ??
          null,
      },
    };
  }

  serialize(
    page
  ) {
    return {
      id:
        page.id,

      title:
        page.title,

      slug:
        page.slug,

      status:
        page.status,

      seoTitle:
        page.seoTitle,

      seoDescription:
        page.metaDescription,

      metaDescription:
        page.metaDescription,

      published:
        page.published,

      updatedAt:
        page.updatedAt,

      version:
        page.version ||
        null,

      blocks:
        (
          page.blocks ||
          []
        ).map(
          (block) => ({
            id:
              block.id,

            type:
              block.blockType,

            status:
              block.status,

            position:
              block.displayOrder,

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
  }

  async get(
    agencyIdOrInput,
    slug = ""
  ) {
    const input =
      this.normalizeReadArguments(
        agencyIdOrInput,
        slug
      );

    const page =
      input.slug === "" &&
      typeof this.repo
        .findHomePage ===
        "function"
        ? await this.repo
            .findHomePage(
              input.agencyId
            )
        : await this.repo
            .findPage(
              input.agencyId,
              input.slug
            );

    if (!page) {
      throw this.notFound(
        `Page ${
          input.slug ||
          "accueil"
        } introuvable.`,
        "PAGE_NOT_FOUND"
      );
    }

    return this.serialize(
      page
    );
  }

  async save(
    agencyIdOrInput,
    slug = "",
    body = {},
    metadata = {}
  ) {
    const input =
      this.normalizeSaveArguments(
        agencyIdOrInput,
        slug,
        body,
        metadata
      );

    const page =
      input.slug === "" &&
      typeof this.repo
        .findHomePage ===
        "function"
        ? await this.repo
            .findHomePage(
              input.agencyId
            )
        : await this.repo
            .findPage(
              input.agencyId,
              input.slug
            );

    if (!page) {
      throw this.notFound(
        `Page ${
          input.slug ||
          "accueil"
        } introuvable.`,
        "PAGE_NOT_FOUND"
      );
    }

    /*
     * Le Core doit migrer les anciens contrats avant la validation
     * historique. Sinon un CTA sans primaryCta est rejeté avant que
     * BlockMigrator puisse le normaliser.
     */
    const coreResult =
      validateAndMigratePagePayload(
        input.body
      );

    const validated =
      validatePagePayload(
        coreResult.payload
      );

    const saved =
      await this.repo
        .replacePageBlocks(
          page,
          validated,
          {
            ...input.metadata,

            coreValidation: {
              blockCount:
                coreResult.summary
                  .blockCount,

              validCount:
                coreResult.summary
                  .validCount,

              migratedCount:
                coreResult.summary
                  .migratedCount,

              migrations:
                coreResult.summary
                  .migrations,
            },
          }
        );

    return this.serialize(
      saved
    );
  }

  async versions(
    agencyIdOrInput,
    slug = ""
  ) {
    const input =
      this.normalizeReadArguments(
        agencyIdOrInput,
        slug
      );

    const page =
      input.slug === "" &&
      typeof this.repo
        .findHomePage ===
        "function"
        ? await this.repo
            .findHomePage(
              input.agencyId
            )
        : await this.repo
            .findPage(
              input.agencyId,
              input.slug
            );

    if (!page) {
      throw this.notFound(
        "Page introuvable.",
        "PAGE_NOT_FOUND"
      );
    }

    return {
      pageId:
        page.id,

      items:
        await this.repo
          .listVersions(
            page.id
          ),
    };
  }

  async rollback(
    agencyIdOrInput,
    slug,
    versionId,
    metadata = {}
  ) {
    const input =
      this.normalizeRollbackArguments(
        agencyIdOrInput,
        slug,
        versionId,
        metadata
      );

    const page =
      input.slug === "" &&
      typeof this.repo
        .findHomePage ===
        "function"
        ? await this.repo
            .findHomePage(
              input.agencyId
            )
        : await this.repo
            .findPage(
              input.agencyId,
              input.slug
            );

    if (!page) {
      throw this.notFound(
        "Page introuvable.",
        "PAGE_NOT_FOUND"
      );
    }

    const version =
      await this.repo
        .findVersion(
          page.id,
          input.versionId
        );

    if (!version) {
      throw this.notFound(
        "Version de page introuvable.",
        "PAGE_BUILDER_VERSION_NOT_FOUND"
      );
    }

    const snapshot =
      version.snapshot;

    const restored =
      await this.repo
        .replacePageBlocks(
          page,
          {
            page: {
              title:
                snapshot.page
                  .title,

              slug:
                snapshot.page
                  .slug,

              status:
                snapshot.page
                  .status,

              seoTitle:
                snapshot.page
                  .seoTitle ||
                "",

              metaDescription:
                snapshot.page
                  .metaDescription ||
                "",

              published:
                snapshot.page
                  .published ===
                true,
            },

            blocks:
              (
                snapshot.blocks ||
                []
              ).map(
                (block) => ({
                  type:
                    block.type,

                  status:
                    block.status,

                  content:
                    block.content,

                  settings:
                    block.settings ||
                    {},

                  seo:
                    block.seo ||
                    {},

                  visibleDesktop:
                    block
                      .visibleDesktop !==
                    false,

                  visibleMobile:
                    block
                      .visibleMobile !==
                    false,
                })
              ),
          },
          {
            ...input.metadata,

            reason:
              `rollback:${
                version.version
              }`,
          }
        );

    return this.serialize(
      restored
    );
  }

  health() {
    return {
      status:
        "ok",

      capability:
        "page-builder-persistence",

      persistence:
        "PageBlock",

      versioning:
        "AgencySitePageVersion",

      rollback:
        true,

      contracts: [
        "object",
        "positional",
      ],
    };
  }
}

module.exports =
  PageBuilderPersistenceService;
