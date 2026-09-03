"use strict";

const AgencySiteService =
  require(
    "../agency-site/service"
  );

const SiteProvisioningRepository =
  require(
    "./repository"
  );

const {
  pageBlocks,
} =
  require(
    "./templates"
  );

function normalizeIds(
  value
) {
  if (
    value == null
  ) {
    return null;
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw Object.assign(
      new Error(
        "agencyIds doit être une liste."
      ),
      {
        statusCode:
          400,

        code:
          "INVALID_AGENCY_IDS",
      }
    );
  }

  const ids = [
    ...new Set(
      value.map(
        Number
      )
    ),
  ];

  if (
    ids.some(
      (
        id
      ) =>
        !Number.isInteger(
          id
        ) ||
        id <= 0
    )
  ) {
    throw Object.assign(
      new Error(
        "agencyIds contient un identifiant invalide."
      ),
      {
        statusCode:
          400,

        code:
          "INVALID_AGENCY_IDS",
      }
    );
  }

  return ids;
}

/**
 * Accepte les deux contrats supportés :
 *
 * contrat natif :
 *
 *   provisionAgency(6, { seedBlocks: true })
 *
 * contrat Network Site Provisioning :
 *
 *   provisionAgency({
 *     agencyId: 6,
 *     agencyIds: [6],
 *     seedBlocks: true,
 *     overwrite: false,
 *     publish: false
 *   })
 *
 * Le provider Site Provisioning est l'endroit approprié
 * pour convertir l'identifiant abstrait du réseau en Agency.id Prisma.
 */
function normalizeAgencyInvocation(
  agencyInput,
  options = {}
) {
  let rawAgencyId =
    agencyInput;

  let normalizedOptions = {
    ...(
      options &&
      typeof options ===
        "object" &&
      !Array.isArray(
        options
      )
        ? options
        : {}
    ),
  };

  if (
    agencyInput &&
    typeof agencyInput ===
      "object" &&
    !Array.isArray(
      agencyInput
    )
  ) {
    normalizedOptions = {
      ...agencyInput,
      ...normalizedOptions,
    };

    rawAgencyId =
      agencyInput.agencyId ??
      (
        Array.isArray(
          agencyInput.agencyIds
        )
          ? agencyInput.agencyIds[0]
          : null
      );
  }

  const agencyId =
    Number(
      rawAgencyId
    );

  if (
    !Number.isInteger(
      agencyId
    ) ||
    agencyId <= 0
  ) {
    throw Object.assign(
      new Error(
        "Identifiant agence invalide pour le provisionnement."
      ),
      {
        statusCode:
          400,

        code:
          "INVALID_AGENCY_ID",

        details: {
          agencyId:
            rawAgencyId ??
            null,
        },
      }
    );
  }

  /*
   * Ces champs décrivent le contexte réseau,
   * pas les options internes de génération d'une agence.
   */
  delete normalizedOptions.agencyId;
  delete normalizedOptions.agencyIds;
  delete normalizedOptions.tenantId;

  return {
    agencyId,
    options:
      normalizedOptions,
  };
}

function isSiteProvisioningRepository(
  value
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  /*
   * Un repository Site Provisioning doit pouvoir :
   *
   * - lister les agences ;
   * - récupérer une agence ;
   * - récupérer son mini-site.
   *
   * Cela permet les injections de repositories de tests
   * sans les confondre avec un PrismaClient.
   */
  return (
    typeof value.listAgencies ===
      "function" &&
    typeof value.getAgency ===
      "function" &&
    typeof value.getSiteByAgencyId ===
      "function"
  );
}

class SiteProvisioningService {
  constructor(
    prismaOrRepo,
    tenantId,
    siteService = null
  ) {
    this.repo =
      isSiteProvisioningRepository(
        prismaOrRepo
      )
        ? prismaOrRepo
        : new SiteProvisioningRepository(
            prismaOrRepo,
            tenantId
          );

    this.siteService =
      siteService ||
      new AgencySiteService(
        prismaOrRepo,
        tenantId
      );
  }

  health() {
    return {
      ok:
        true,

      version:
        "14.2.0",

      capability:
        "mini-site-auto-provisioning",
    };
  }

  async status() {
    const agencies =
      await this.repo
        .listAgencies();

    const rows =
      agencies.map(
        (
          agency
        ) => ({
          agencyId:
            agency.id,

          agencyName:
            agency.name,

          city:
            agency.city,

          provisioned:
            agency.agencySites
              .length >
            0,

          site:
            agency.agencySites[0] ||
            null,
        })
      );

    return {
      totalAgencies:
        rows.length,

      provisioned:
        rows.filter(
          (
            item
          ) =>
            item.provisioned
        ).length,

      missing:
        rows.filter(
          (
            item
          ) =>
            !item.provisioned
        ).length,

      agencies:
        rows,
    };
  }

  async ensureRequiredPages(
    site,
    agency
  ) {
    if (!site) {
      throw Object.assign(
        new Error(
          "Mini-site requis pour préparer les pages."
        ),
        {
          statusCode:
            500,

          code:
            "SITE_REQUIRED",
        }
      );
    }

    const requiredKeys = [
      "home",
      "agence",
      "services",
      "contact",
    ];

    /*
     * HOME possède slug="" dans AgencySitePage.
     * On travaille donc ici avec les clés fonctionnelles
     * plutôt qu'avec le slug littéral "home".
     */
    const canonical =
      value => {
        const slug =
          String(
            value ??
            ""
          )
            .trim()
            .toLowerCase();

        return slug ===
          ""
          ? "home"
          : slug;
      };

    const existingKeys =
      new Set(
        (
          site.pages ||
          []
        ).map(
          page =>
            canonical(
              page.slug
            )
        )
      );

    const missing =
      requiredKeys.filter(
        key =>
          !existingKeys.has(
            key
          )
      );

    if (
      missing.length ===
      0
    ) {
      return {
        created:
          0,

        skipped:
          requiredKeys.length,

        missing:
          [],

        generatorAvailable:
          Boolean(
            this.siteService
              ?.ensureRequiredPages
          ),

        site,
      };
    }

    /*
     * Contrat de compatibilité :
     *
     * Les services injectés historiques ne possèdent
     * pas forcément ensureRequiredPages().
     *
     * Dans ce cas :
     * - on ne rappelle PAS generate()
     * - on ne casse PAS provisionAgency()
     * - on expose simplement les pages manquantes.
     */
    if (
      typeof this.siteService
        ?.ensureRequiredPages !==
        "function"
    ) {
      return {
        created:
          0,

        skipped:
          requiredKeys.length -
          missing.length,

        missing,

        generatorAvailable:
          false,

        site,
      };
    }

    const result =
      await this.siteService
        .ensureRequiredPages(
          agency.id,
          missing
        );

    return {
      ...result,

      generatorAvailable:
        true,
    };
  }

  async ensureProvisionedDefaultContent(
    agency
  ) {
    if (
      !agency ||
      !agency.id
    ) {
      return {
        supported:
          false,

        executed:
          false,

        reason:
          "AGENCY_MISSING",
      };
    }

    /*
     * Compatibilité historique :
     *
     * certains tests injectent un siteService minimal.
     * Dans ce cas, l'absence de ensureDefaultContent()
     * ne doit pas casser le provisioning historique.
     */
    if (
      typeof this.siteService
        ?.ensureDefaultContent !==
        "function"
    ) {
      return {
        supported:
          false,

        executed:
          false,

        reason:
          "DEFAULT_CONTENT_WRITER_UNAVAILABLE",
      };
    }

    const output =
      await this.siteService
        .ensureDefaultContent(
          agency.id
        );

    return {
      supported:
        true,

      executed:
        true,

      result:
        output?.result ||
        null,

      planSummary:
        output?.plan?.summary ||
        null,
    };
  }

  async seedBlocks(
    site,
    agency
  ) {
    let created =
      0;

    let skipped =
      0;

    for (
      const page
      of site.pages ||
      []
    ) {
      const blocks =
        pageBlocks(
          {
            ...page,

            siteBasePath:
              site.basePath,
          },
          agency
        );

      for (
        const block
        of blocks
      ) {
        const exists =
          await this.repo
            .findBlock(
              page.id,
              block.name
            );

        if (exists) {
          skipped +=
            1;

          continue;
        }

        await this.repo
          .createBlock(
            page.id,
            block
          );

        created +=
          1;
      }
    }

    return {
      created,
      skipped,
    };
  }

  async provisionAgency(
    agencyInput,
    options = {}
  ) {
    const invocation =
      normalizeAgencyInvocation(
        agencyInput,
        options
      );

    const agencyId =
      invocation.agencyId;

    const provisionOptions =
      invocation.options;

    const agency =
      await this.repo
        .getAgency(
          agencyId
        );

    if (!agency) {
      throw Object.assign(
        new Error(
          `Agence ${agencyId} introuvable pour ce tenant.`
        ),
        {
          statusCode:
            404,

          code:
            "AGENCY_NOT_FOUND",
        }
      );
    }

    let site =
      await this.repo
        .getSiteByAgencyId(
          agency.id
        );

    const alreadyProvisioned =
      Boolean(
        site
      );

    if (!site) {
      await this.siteService
        .generate(
          agency.id,
          provisionOptions.slug
            ? {
                slug:
                  provisionOptions.slug,
              }
            : {}
        );

      site =
        await this.repo
          .getSiteByAgencyId(
            agency.id
          );
    }

    if (!site) {
      throw Object.assign(
        new Error(
          `Le mini-site de l'agence ${agency.id} n'a pas pu être créé.`
        ),
        {
          statusCode:
            500,

          code:
            "SITE_PROVISIONING_FAILED",
        }
      );
    }

    const requiredPages =
      await this.ensureRequiredPages(
        site,
        agency
      );

    if (
      requiredPages.site
    ) {
      site =
        requiredPages.site;
    }

    /*
     * Une fois la structure minimale garantie,
     * compléter uniquement les sections générales absentes.
     *
     * Le writer A3 est create-only :
     * il ne met jamais à jour une section existante.
     */
    const defaultContent =
      await this.ensureProvisionedDefaultContent(
        agency
      );

    /*
     * Recharger le site afin que seedBlocks() travaille
     * sur l'état réel après création éventuelle des
     * sections générales.
     */
    const refreshedAfterContent =
      await this.repo
        .getSiteByAgencyId(
          agency.id
        );

    if (
      refreshedAfterContent
    ) {
      site =
        refreshedAfterContent;
    }

    const blocks =
      provisionOptions.seedBlocks ===
      false
        ? {
            created:
              0,

            skipped:
              0,
          }
        : await this.seedBlocks(
            site,
            agency
          );

    return {
      agencyId:
        agency.id,

      agencyName:
        agency.name,

      alreadyProvisioned,

      siteId:
        site.id,

      siteSlug:
        site.slug,

      pageCount:
        site.pages
          ?.length ||
        0,

      requiredPages,

      defaultContent,

      blocks,
    };
  }

  async provisionBatch(
    input = {}
  ) {
    const agencyIds =
      normalizeIds(
        input.agencyIds
      );

    const agencies =
      await this.repo
        .listAgencies(
          agencyIds
        );

    const dryRun =
      input.dryRun ===
      true;

    const missingOnly =
      input.missingOnly !==
      false;

    const selected =
      missingOnly
        ? agencies.filter(
            (
              agency
            ) =>
              agency.agencySites
                .length ===
              0
          )
        : agencies;

    if (dryRun) {
      return {
        dryRun:
          true,

        selected:
          selected.length,

        agencies:
          selected.map(
            (
              agency
            ) => ({
              agencyId:
                agency.id,

              agencyName:
                agency.name,

              alreadyProvisioned:
                agency.agencySites
                  .length >
                0,
            })
          ),
      };
    }

    const results =
      [];

    for (
      const agency
      of selected
    ) {
      try {
        results.push({
          ok:
            true,

          ...(
            await this.provisionAgency(
              agency.id,
              {
                seedBlocks:
                  input.seedBlocks !==
                  false,
              }
            )
          ),
        });
      } catch (error) {
        results.push({
          ok:
            false,

          agencyId:
            agency.id,

          agencyName:
            agency.name,

          error:
            error.message,

          code:
            error.code ||
            "PROVISIONING_ERROR",
        });
      }
    }

    return {
      dryRun:
        false,

      selected:
        selected.length,

      succeeded:
        results.filter(
          (
            item
          ) =>
            item.ok
        ).length,

      failed:
        results.filter(
          (
            item
          ) =>
            !item.ok
        ).length,

      results,
    };
  }
}

module.exports = {
  SiteProvisioningService,
  normalizeIds,
  normalizeAgencyInvocation,
  isSiteProvisioningRepository,
};
