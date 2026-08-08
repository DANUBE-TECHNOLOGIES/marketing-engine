"use strict";

const {
  PersistentTemplateLibraryService,
} =
  require(
    "../template-library"
  );

const {
  buildComposerContext,
} =
  require(
    "./context-builder"
  );

const {
  createContentProvider,
} =
  require(
    "./provider-factory"
  );

const {
  evaluateGeneratedContent,
} =
  require(
    "./quality-guard"
  );

const {
  normalizePageType,
  normalizeAgencyId,
  sanitizeInstructions,
  composerError,
} =
  require(
    "./contract"
  );

class ContentComposerService {
  constructor({
    prisma,
    templateLibrary,
    provider,
  } = {}) {
    if (!prisma) {
      throw new Error(
        "PrismaClient obligatoire."
      );
    }

    this.prisma =
      prisma;

    this.templateLibrary =
      templateLibrary ||
      new PersistentTemplateLibraryService({
        prisma,
      });

    this.provider =
      provider ||
      createContentProvider();
  }

  health() {
    return {
      module:
        "content-composer",

      version:
        "25.2-A",

      capabilities: [
        "compose",
        "preview",
        "context",
        "quality-guard",
        "seo-score",
        "factual-safety",
        "duplication-check",
      ],

      persistence:
        false,

      publishing:
        false,
    };
  }

  async getAgency({
    tenantId,
    agencyId,
  }) {
    const agency =
      await this.prisma
        .agency
        .findFirst({
          where: {
            tenantId,
            id:
              agencyId,
          },
        });

    if (!agency) {
      throw composerError(
        "Agence introuvable.",
        "COMPOSER_AGENCY_NOT_FOUND",
        404
      );
    }

    return agency;
  }

  async getSite({
    tenantId,
    agencyId,
  }) {
    return this.prisma
      .agencySite
      .findFirst({
        where: {
          tenantId,
          agencyId,
        },
      });
  }

  async getBrandProfile({
    tenantId,
    agencyId,
  }) {
    if (
      !this.prisma
        .brandProfile
    ) {
      return null;
    }

    return this.prisma
      .brandProfile
      .findFirst({
        where: {
          tenantId,

          OR: [
            {
              agencyId,
            },

            {
              agencyId:
                null,
            },
          ],
        },

        orderBy: {
          agencyId:
            "desc",
        },
      });
  }

  async createDraftFromGeneration({
    tenantId,
    agencyId,
    generation,
    actor =
      null,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    if (
      !generation ||
      typeof generation !==
        "object" ||
      Array.isArray(
        generation
      )
    ) {
      throw composerError(
        "Génération invalide.",
        "INVALID_GENERATION_PAYLOAD",
        400
      );
    }

    if (
      generation.accepted !==
      true
    ) {
      throw composerError(
        "Seule une génération acceptée peut devenir un brouillon.",
        "GENERATION_NOT_ACCEPTED",
        409
      );
    }

    if (
      generation.persistence !==
        false ||
      generation.publishing !==
        false
    ) {
      throw composerError(
        "Etat de sécurité de la génération invalide.",
        "GENERATION_SECURITY_STATE_INVALID",
        409
      );
    }

    const sourceTemplate =
      generation.sourceTemplate;

    if (
      !sourceTemplate ||
      !sourceTemplate.pageType
    ) {
      throw composerError(
        "Template source absent.",
        "GENERATION_SOURCE_TEMPLATE_MISSING",
        400
      );
    }

    const pageType =
      normalizePageType(
        sourceTemplate.pageType
      );

    const agency =
      await this.getAgency({
        tenantId,

        agencyId:
          normalizedAgencyId,
      });

    const content =
      generation.content;

    if (
      !content ||
      !Array.isArray(
        content.sections
      )
    ) {
      throw composerError(
        "Contenu généré invalide.",
        "INVALID_GENERATED_CONTENT",
        400
      );
    }

    /*
     * Revalider localement la génération.
     * On ne fait jamais confiance au seul booléen accepted
     * reçu depuis le navigateur.
     */
    const resolved =
      await this.templateLibrary
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType,

          variant:
            sourceTemplate.variant ||
            "default",
        });

    const site =
      await this.getSite({
        tenantId,

        agencyId:
          normalizedAgencyId,
      });

    const brandProfile =
      await this.getBrandProfile({
        tenantId,

        agencyId:
          normalizedAgencyId,
      });

    const context =
      buildComposerContext({
        agency,
        site,
        brandProfile,

        seo:
          generation.context?.seo ||
          {},

        template:
          resolved.template,
      });

    const quality =
      evaluateGeneratedContent({
        template:
          resolved.template,

        content,

        context,
      });

    if (
      quality.accepted !==
      true
    ) {
      throw composerError(
        "La génération ne passe plus le Quality Guard.",
        "GENERATION_QUALITY_REJECTED",
        409
      );
    }

    /*
     * On transforme la génération en définition de template.
     * AUCUN assignment.
     * AUCUNE activation.
     * AUCUNE publication.
     */
    const now =
      Date.now();

    const sourceId =
      String(
        sourceTemplate.id ||
        "generated"
      );

    const templateKey =
      `${sourceId}.ai-agency-${normalizedAgencyId}.draft-${now}`;

    const version =
      `${String(
        sourceTemplate.version ||
        "1.0.0"
      )}-ai-draft.${now}`;

    const definition = {
      id:
        templateKey,

      name:
        `${sourceTemplate.name || sourceId} — Proposition IA agence ${normalizedAgencyId}`,

      description:
        `Brouillon issu du Content Composer pour ${agency.name}`,

      kind:
        resolved.template.kind ||
        "page",

      pageType,

      variant:
        sourceTemplate.variant ||
        "default",

      version,

      status:
        "draft",

      scope:
        "agency",

      sections:
        content.sections,

      seo:
        content.seo ||
        {},

      metadata: {
        generatedBy:
          "content-composer",

        provider:
          generation.provider?.name ||
          null,

        model:
          generation.provider?.model ||
          null,

        qualityScore:
          quality.score,

        seoScore:
          quality.seo?.score ??
          null,

        generatedAt:
          new Date().toISOString(),
      },
    };

    /*
     * Accès à la persistance Template Library uniquement
     * via son repository dédié.
     */
    const templateRepository =
      this.templateLibrary
        .repository;

    if (
      !templateRepository ||
      typeof templateRepository
        .createDefinition !==
      "function"
    ) {
      throw composerError(
        "Template Library writer indisponible.",
        "TEMPLATE_LIBRARY_WRITER_UNAVAILABLE",
        500
      );
    }

    const created =
      await templateRepository
        .createDefinition({
          templateKey,

          name:
            definition.name,

          description:
            definition.description,

          kind:
            definition.kind,

          pageType,

          variant:
            definition.variant,

          version,

          status:
            "draft",

          scope:
            "agency",

          tenantId,

          agencyId:
            normalizedAgencyId,

          definition,

          tags: [
            "ai-generated",
            "agency-draft",
          ],

          metadata: {
            generatedBy:
              "content-composer",

            sourceTemplateId:
              sourceTemplate.id ||
              null,

            sourceTemplateVersion:
              sourceTemplate.version ||
              null,

            qualityScore:
              quality.score,

            seoScore:
              quality.seo?.score ??
              null,

            certification:
              false,
          },

          createdBy:
            actor,
        });

    return {
      created:
        true,

      persistence:
        true,

      persistenceTarget:
        "TemplateDefinition",

      assignmentChanged:
        false,

      activation:
        false,

      publishing:
        false,

      quality: {
        accepted:
          quality.accepted,

        score:
          quality.score,

        seoScore:
          quality.seo?.score ??
          null,
      },

      draft: {
        id:
          created.id,

        templateKey:
          created.templateKey,

        name:
          created.name,

        pageType:
          created.pageType,

        variant:
          created.variant,

        version:
          created.version,

        status:
          created.status,

        scope:
          created.scope,

        tenantId:
          created.tenantId,

        agencyId:
          created.agencyId,
      },
    };
  }

  async compose({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
    instructions =
      "",
    seo =
      {},
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const normalizedPageType =
      normalizePageType(
        pageType
      );

    const normalizedInstructions =
      sanitizeInstructions(
        instructions
      );

    const agency =
      await this.getAgency({
        tenantId,
        agencyId:
          normalizedAgencyId,
      });

    const site =
      await this.getSite({
        tenantId,
        agencyId:
          normalizedAgencyId,
      });

    const brandProfile =
      await this.getBrandProfile({
        tenantId,
        agencyId:
          normalizedAgencyId,
      });

    const resolved =
      await this.templateLibrary
        .resolve({
          tenantId,
          agencyId:
            normalizedAgencyId,
          pageType:
            normalizedPageType,
          variant,
        });

    const context =
      buildComposerContext({
        agency,
        site,
        brandProfile,
        seo,
        template:
          resolved.template,
      });

    const generated =
      await this.provider
        .generate({
          template:
            resolved.template,

          context,

          instructions:
            normalizedInstructions,
        });

    const quality =
      evaluateGeneratedContent({
        template:
          resolved.template,

        content: {
          sections:
            generated.sections,

          seo:
            generated.seo,
        },

        context,
      });

    return {
      generated:
        true,

      persistence:
        false,

      publishing:
        false,

      sourceTemplate: {
        source:
          resolved.source,

        id:
          resolved.template.id,

        name:
          resolved.template.name,

        version:
          resolved.template.version,

        pageType:
          resolved.template.pageType,

        variant:
          resolved.template.variant,
      },

      provider: {
        name:
          generated.provider,

        model:
          generated.model ||
          null,

        fallbackUsed:
          generated.fallbackUsed ===
          true,

        fallbackReason:
          generated.fallbackReason ||
          null,

        usage:
          generated.usage ||
          null,
      },

      context,

      quality,

      accepted:
        quality.accepted,

      content: {
        sections:
          generated.sections,

        seo:
          generated.seo,
      },
    };
  }
}

module.exports = {
  ContentComposerService,
};
