"use strict";

const {
  MiniSiteBlueprintService,
} = require(
  "../minisite-blueprint"
);

const {
  BlueprintPersistenceRepository,
} = require(
  "./repository"
);

const {
  buildPersistencePlan,
} = require(
  "./planner"
);

const {
  cityFromAgencyName,
  determineBlueprint,
} = require(
  "./utils"
);

class MiniSiteBlueprintPersistenceService {
  constructor({
    prisma,
    tenantId,
    repository,
    blueprintService,
  } = {}) {
    this.repository =
      repository ||
      new BlueprintPersistenceRepository(
        prisma,
        tenantId
      );

    this.blueprintService =
      blueprintService ||
      new MiniSiteBlueprintService();
  }

  health() {
    return {
      status:
        "ok",

      capability:
        "minisite-blueprint-persistence-planner",

      persistence:
        false,

      dryRun:
        true,

      overwrite:
        false,

      operations: [
        "previewAgency",
        "previewNetwork",
        "applyAgency",
      ],
    };
  }

  async previewAgency({
    agencyId,
    blueprint,
  } = {}) {
    if (!agencyId) {
      const error =
        new Error(
          "agencyId est obligatoire."
        );

      error.code =
        "BLUEPRINT_AGENCY_ID_REQUIRED";

      error.status =
        400;

      throw error;
    }

    const agency =
      await this.repository
        .findAgency(
          agencyId
        );

    if (!agency) {
      const error =
        new Error(
          "Agence introuvable."
        );

      error.code =
        "BLUEPRINT_AGENCY_NOT_FOUND";

      error.status =
        404;

      throw error;
    }

    const site =
      await this.repository
        .findSiteByAgency(
          agencyId
        );

    if (!site) {
      const error =
        new Error(
          "Mini-site introuvable pour cette agence."
        );

      error.code =
        "BLUEPRINT_SITE_NOT_FOUND";

      error.status =
        404;

      throw error;
    }

    const blueprintId =
      blueprint ||
      determineBlueprint(
        agency.name
      );

    const generated =
      this.blueprintService
        .preview({
          agencyId:
            agency.id,

          agencyName:
            agency.name,

          city:
            agency.city ||
            cityFromAgencyName(
              agency.name
            ),

          siteSlug:
            site.slug,

          blueprint:
            blueprintId,

          email:
            agency.email ||
            "",

          phone:
            agency.phone ||
            "",

          address:
            agency.address ||
            "",

          postalCode:
            agency.postalCode ||
            "",
        });

    return {
      agency,
      plan:
        buildPersistencePlan({
          blueprint:
            generated,

          existingSite:
            site,
        }),
    };
  }


  async applyAgency({
    agencyId,
    blueprint,
    dryRun = true,
    confirm = false,
  } = {}) {
    if (
      dryRun === false &&
      confirm !== true
    ) {
      const error =
        new Error(
          "Une confirmation explicite est obligatoire."
        );

      error.code =
        "BLUEPRINT_CONFIRMATION_REQUIRED";

      error.status =
        400;

      throw error;
    }

    const preview =
      await this.previewAgency({
        agencyId,
        blueprint,
      });

    const result =
      await this.repository
        .applyMissingBlocks({
          siteId:
            preview.plan.site.id,

          pagePlans:
            preview.plan.pages,

          dryRun:
            dryRun !== false,
        });

    return {
      operation:
        dryRun === false
          ? "apply"
          : "preview-apply",

      destructive:
        false,

      overwrite:
        false,

      agency:
        preview.agency,

      blueprint:
        preview.plan.blueprint,

      planSummary:
        preview.plan.summary,

      execution:
        result,
    };
  }

  async previewNetwork() {
    const agencies =
      await this.repository
        .listAgencies();

    const items = [];

    for (
      const agency
      of agencies
    ) {
      try {
        items.push(
          await this.previewAgency({
            agencyId:
              agency.id,
          })
        );
      } catch (error) {
        items.push({
          agency,

          error: {
            code:
              error.code ||
              "BLUEPRINT_PREVIEW_ERROR",

            message:
              error.message,
          },
        });
      }
    }

    return {
      mode:
        "dry-run",

      persistence:
        false,

      agencyCount:
        agencies.length,

      successCount:
        items.filter(
          (item) =>
            item.plan
        ).length,

      errorCount:
        items.filter(
          (item) =>
            item.error
        ).length,

      summary: {
        createPages:
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (
                item.plan
                  ?.summary
                  ?.createPages ||
                0
              ),
            0
          ),

        enrichPages:
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (
                item.plan
                  ?.summary
                  ?.enrichPages ||
                0
              ),
            0
          ),

        addBlocks:
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (
                item.plan
                  ?.summary
                  ?.addBlocks ||
                0
              ),
            0
          ),

        keepBlocks:
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (
                item.plan
                  ?.summary
                  ?.keepBlocks ||
                0
              ),
            0
          ),
      },

      items,
    };
  }
}

module.exports = {
  MiniSiteBlueprintPersistenceService,
};
