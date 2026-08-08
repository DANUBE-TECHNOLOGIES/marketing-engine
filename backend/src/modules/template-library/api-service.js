"use strict";

const {
  TemplateLibraryRepository,
} =
  require(
    "./repository"
  );

const {
  PersistentTemplateLibraryService,
} =
  require(
    "./persistent-service"
  );

const {
  TemplateRenderer,
} =
  require(
    "./renderer"
  );

const {
  buildAgencyContext,
} =
  require(
    "../content-engine/default-content"
  );

const ALLOWED_PAGE_TYPES =
  new Set([
    "HOME",
    "AGENCY",
    "SERVICES",
    "CONTACT",
    "LEGAL",
    "PRIVACY",
  ]);

const ALLOWED_SCOPES =
  new Set([
    "platform",
    "tenant",
    "agency",
  ]);

function httpError(
  message,
  code,
  statusCode
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.statusCode =
    statusCode;

  return error;
}

function normalizePageType(
  value
) {
  const pageType =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !ALLOWED_PAGE_TYPES.has(
      pageType
    )
  ) {
    throw httpError(
      `pageType invalide : ${pageType || "(vide)"}`,
      "INVALID_TEMPLATE_PAGE_TYPE",
      400
    );
  }

  return pageType;
}

function normalizeAgencyId(
  value,
  {
    optional =
      false,
  } = {}
) {
  if (
    (
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ""
    ) &&
    optional
  ) {
    return null;
  }

  const id =
    Number(
      value
    );

  if (
    !Number.isInteger(
      id
    ) ||
    id <=
      0
  ) {
    throw httpError(
      "agencyId invalide.",
      "INVALID_AGENCY_ID",
      400
    );
  }

  return id;
}


function stableJson(
  value
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      stableJson
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.keys(
        value
      )
        .sort()
        .map(
          key => [
            key,
            stableJson(
              value[key]
            ),
          ]
        )
    );
  }

  return value;
}

function buildTemplateDiff(
  before,
  after
) {
  const beforeStable =
    stableJson(
      before ||
      {}
    );

  const afterStable =
    stableJson(
      after ||
      {}
    );

  const beforeText =
    JSON.stringify(
      beforeStable,
      null,
      2
    );

  const afterText =
    JSON.stringify(
      afterStable,
      null,
      2
    );

  const changed =
    beforeText !==
    afterText;

  const beforeSections =
    Array.isArray(
      before?.sections
    )
      ? before.sections
      : [];

  const afterSections =
    Array.isArray(
      after?.sections
    )
      ? after.sections
      : [];

  const sectionKey =
    section =>
      String(
        section?.sectionType ||
        ""
      );

  const beforeMap =
    new Map(
      beforeSections.map(
        section => [
          sectionKey(
            section
          ),
          section,
        ]
      )
    );

  const afterMap =
    new Map(
      afterSections.map(
        section => [
          sectionKey(
            section
          ),
          section,
        ]
      )
    );

  const names =
    new Set([
      ...beforeMap.keys(),
      ...afterMap.keys(),
    ]);

  const sections =
    [];

  for (
    const name
    of names
  ) {
    const left =
      beforeMap.get(
        name
      );

    const right =
      afterMap.get(
        name
      );

    let status =
      "unchanged";

    if (
      !left &&
      right
    ) {
      status =
        "added";
    } else if (
      left &&
      !right
    ) {
      status =
        "removed";
    } else if (
      JSON.stringify(
        stableJson(
          left
        )
      ) !==
      JSON.stringify(
        stableJson(
          right
        )
      )
    ) {
      status =
        "changed";
    }

    sections.push({
      sectionType:
        name,

      status,
    });
  }

  return {
    changed,

    sections,

    seoChanged:
      JSON.stringify(
        stableJson(
          before?.seo ||
          {}
        )
      ) !==
      JSON.stringify(
        stableJson(
          after?.seo ||
          {}
        )
      ),

    before:
      beforeStable,

    after:
      afterStable,
  };
}

class TemplateLibraryApiService {
  constructor({
    prisma,
  } = {}) {
    if (!prisma) {
      throw new Error(
        "PrismaClient obligatoire."
      );
    }

    this.prisma =
      prisma;

    this.repository =
      new TemplateLibraryRepository(
        prisma
      );

    this.library =
      new PersistentTemplateLibraryService({
        prisma,
      });

    this.renderer =
      new TemplateRenderer();
  }

  health() {
    return {
      module:
        "template-library-api",

      version:
        "25.1C-A",

      capabilities: [
        "list",
        "get",
        "resolve",
        "preview",
        "assign",
        "assignments",
      ],

      publishing:
        false,
    };
  }

  async resolveTenant({
    tenantId,
    tenantSlug,
  } = {}) {
    if (tenantId) {
      const tenant =
        await this.prisma
          .tenant
          .findUnique({
            where: {
              id:
                tenantId,
            },

            select: {
              id:
                true,

              slug:
                true,
            },
          });

      if (!tenant) {
        throw httpError(
          "Tenant introuvable.",
          "TENANT_NOT_FOUND",
          404
        );
      }

      return tenant;
    }

    if (tenantSlug) {
      const tenant =
        await this.prisma
          .tenant
          .findFirst({
            where: {
              slug:
                tenantSlug,
            },

            select: {
              id:
                true,

              slug:
                true,
            },
          });

      if (!tenant) {
        throw httpError(
          `Tenant ${tenantSlug} introuvable.`,
          "TENANT_NOT_FOUND",
          404
        );
      }

      return tenant;
    }

    throw httpError(
      "Contexte tenant requis.",
      "TENANT_REQUIRED",
      400
    );
  }

  async assertAgency({
    agencyId,
    tenantId,
  }) {
    const agency =
      await this.prisma
        .agency
        .findFirst({
          where: {
            id:
              agencyId,

            tenantId,
          },
        });

    if (!agency) {
      throw httpError(
        `Agence ${agencyId} introuvable pour ce tenant.`,
        "AGENCY_NOT_FOUND",
        404
      );
    }

    return agency;
  }

  async listTemplates({
    tenantId,
    agencyId,
    pageType,
    variant,
  } = {}) {
    const platform =
      await this.repository
        .listDefinitions({
          scope:
            "platform",

          tenantId:
            null,

          agencyId:
            null,

          pageType,
          variant,
        });

    const tenant =
      tenantId
        ? await this.repository
            .listDefinitions({
              scope:
                "tenant",

              tenantId,

              agencyId:
                null,

              pageType,
              variant,
            })
        : [];

    const agency =
      agencyId
        ? await this.repository
            .listDefinitions({
              scope:
                "agency",

              tenantId,

              agencyId,

              pageType,
              variant,
            })
        : [];

    return [
      ...agency,
      ...tenant,
      ...platform,
    ].map(
      item => ({
        id:
          item.id,

        templateKey:
          item.templateKey,

        name:
          item.name,

        description:
          item.description,

        pageType:
          item.pageType,

        variant:
          item.variant,

        version:
          item.version,

        scope:
          item.scope,

        tenantId:
          item.tenantId,

        agencyId:
          item.agencyId,

        status:
          item.status,

        tags:
          item.tags,

        updatedAt:
          item.updatedAt,
      })
    );
  }

  async getTemplate(
    id
  ) {
    const template =
      await this.repository
        .getDefinition(
          id
        );

    if (!template) {
      throw httpError(
        "Template introuvable.",
        "TEMPLATE_NOT_FOUND",
        404
      );
    }

    return template;
  }

  async resolve({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    const normalizedPageType =
      normalizePageType(
        pageType
      );

    if (
      agencyId !==
        null &&
      agencyId !==
        undefined
    ) {
      await this.assertAgency({
        agencyId,
        tenantId,
      });
    }

    const result =
      await this.library
        .resolve({
          tenantId,

          agencyId,

          pageType:
            normalizedPageType,

          variant,
        });

    return {
      source:
        result.source,

      inherited:
        result.source !==
        "agency",

      assignmentId:
        result.assignment?.id ||
        null,

      template: {
        id:
          result.template.id,

        name:
          result.template.name,

        pageType:
          result.template.pageType,

        variant:
          result.template.variant,

        version:
          result.template.version,

        scope:
          result.template.scope,

        status:
          result.template.status,
      },
    };
  }

  async preview({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const agency =
      await this.assertAgency({
        agencyId:
          normalizedAgencyId,

        tenantId,
      });

    const site =
      await this.prisma
        .agencySite
        .findFirst({
          where: {
            agencyId:
              normalizedAgencyId,

            tenantId,
          },
        });

    const resolved =
      await this.library
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            normalizePageType(
              pageType
            ),

          variant,
        });

    const context =
      buildAgencyContext(
        agency,
        site ||
        {}
      );

    const rendered =
      this.renderer
        .render(
          resolved.template,
          context,
          {
            strict:
              false,
          }
        );

    return {
      source:
        resolved.source,

      publishing:
        false,

      template: {
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

      preview:
        rendered,
    };
  }

  async listAgencyDrafts({
    tenantId,
    agencyId,
    pageType,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    return this.repository
      .listDefinitions({
        scope:
          "agency",

        tenantId,

        agencyId:
          normalizedAgencyId,

        pageType:
          pageType
            ? normalizePageType(
                pageType
              )
            : undefined,

        status:
          "draft",
      });
  }

  async cloneAgencyDraft({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
    actor =
      null,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const normalizedPageType =
      normalizePageType(
        pageType
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    /*
     * Résoudre le template réellement utilisé AVANT toute création.
     *
     * Cela peut provenir de :
     *
     * agency
     * tenant
     * platform
     * builtin
     */
    const resolved =
      await this.library
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            normalizedPageType,

          variant,
        });

    const source =
      resolved.template;

    if (!source) {
      throw httpError(
        "Template source introuvable.",
        "TEMPLATE_SOURCE_NOT_FOUND",
        404
      );
    }

    const now =
      Date.now();

    const sourceId =
      String(
        source.id ||
        "template"
      );

    const draftTemplateKey =
      `${sourceId}.agency-${normalizedAgencyId}.draft-${now}`;

    const draftVersion =
      `${String(
        source.version ||
        "1.0.0"
      )}-draft.${now}`;

    /*
     * Copie profonde JSON.
     */
    const definition =
      JSON.parse(
        JSON.stringify(
          source
        )
      );

    definition.id =
      draftTemplateKey;

    definition.name =
      `${source.name || sourceId} — Brouillon agence ${normalizedAgencyId}`;

    definition.version =
      draftVersion;

    definition.status =
      "draft";

    definition.scope =
      "agency";

    definition.metadata = {
      ...(
        definition.metadata ||
        {}
      ),

      clonedFrom: {
        source:
          resolved.source,

        templateId:
          source.id,

        version:
          source.version ||
          null,
      },

      draft:
        true,
    };

    const created =
      await this.repository
        .createDefinition({
          scope:
            "agency",

          tenantId,

          agencyId:
            normalizedAgencyId,

          templateKey:
            draftTemplateKey,

          name:
            definition.name,

          description:
            `Brouillon cloné depuis ${source.name || source.id}`,

          kind:
            definition.kind ||
            "page",

          pageType:
            normalizedPageType,

          variant,

          version:
            draftVersion,

          status:
            "draft",

          definition,

          tags: [
            ...(
              Array.isArray(
                source.tags
              )
                ? source.tags
                : []
            ),

            "agency-draft",
          ],

          metadata: {
            draft:
              true,

            clonedFromSource:
              resolved.source,

            clonedFromTemplate:
              source.id,

            clonedFromVersion:
              source.version ||
              null,
          },

          createdBy:
            actor,
        });

    /*
     * IMPORTANT :
     *
     * aucun setAssignment() ici.
     *
     * Le template actif reste inchangé.
     */
    return {
      created:
        true,

      publishing:
        false,

      assignmentChanged:
        false,

      source: {
        inheritance:
          resolved.source,

        id:
          source.id,

        name:
          source.name,

        version:
          source.version,
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

        scope:
          created.scope,

        status:
          created.status,

        tenantId:
          created.tenantId,

        agencyId:
          created.agencyId,
      },
    };
  }

  async previewDraft({
    tenantId,
    agencyId,
    draftId,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const agency =
      await this.assertAgency({
        agencyId:
          normalizedAgencyId,

        tenantId,
      });

    const draft =
      await this.repository
        .getDefinition(
          draftId
        );

    if (!draft) {
      throw httpError(
        "Brouillon introuvable.",
        "TEMPLATE_DRAFT_NOT_FOUND",
        404
      );
    }

    if (
      draft.scope !==
        "agency" ||
      draft.status !==
        "draft" ||
      draft.tenantId !==
        tenantId ||
      draft.agencyId !==
        normalizedAgencyId
    ) {
      throw httpError(
        "Ce brouillon n'appartient pas à cette agence.",
        "TEMPLATE_DRAFT_FORBIDDEN",
        403
      );
    }

    const site =
      await this.prisma
        .agencySite
        .findFirst({
          where: {
            agencyId:
              normalizedAgencyId,

            tenantId,
          },
        });

    const context =
      buildAgencyContext(
        agency,
        site ||
        {}
      );

    const rendered =
      this.renderer
        .render(
          draft.definition,
          context,
          {
            strict:
              false,
          }
        );

    return {
      publishing:
        false,

      assignmentChanged:
        false,

      draft: {
        id:
          draft.id,

        templateKey:
          draft.templateKey,

        name:
          draft.name,

        pageType:
          draft.pageType,

        version:
          draft.version,

        status:
          draft.status,
      },

      preview:
        rendered,
    };
  }

  async assertAgencyDraft({
    tenantId,
    agencyId,
    draftId,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    const draft =
      await this.repository
        .getDefinition(
          draftId
        );

    if (!draft) {
      throw httpError(
        "Brouillon introuvable.",
        "TEMPLATE_DRAFT_NOT_FOUND",
        404
      );
    }

    if (
      draft.scope !==
        "agency" ||
      draft.tenantId !==
        tenantId ||
      draft.agencyId !==
        normalizedAgencyId
    ) {
      throw httpError(
        "Ce brouillon n'appartient pas à cette agence.",
        "TEMPLATE_DRAFT_FORBIDDEN",
        403
      );
    }

    return {
      draft,
      agencyId:
        normalizedAgencyId,
    };
  }

  async updateDraft({
    tenantId,
    agencyId,
    draftId,
    definition,
    actor =
      null,
  }) {
    const {
      draft,
      agencyId:
        normalizedAgencyId,
    } =
      await this.assertAgencyDraft({
        tenantId,
        agencyId,
        draftId,
      });

    if (
      draft.status !==
      "draft"
    ) {
      throw httpError(
        "Seul un brouillon peut être modifié.",
        "TEMPLATE_NOT_DRAFT",
        409
      );
    }

    if (
      !definition ||
      typeof definition !==
        "object" ||
      Array.isArray(
        definition
      )
    ) {
      throw httpError(
        "Définition JSON invalide.",
        "INVALID_TEMPLATE_DEFINITION",
        400
      );
    }

    if (
      String(
        definition.pageType ||
        draft.pageType
      ).toUpperCase() !==
      draft.pageType
    ) {
      throw httpError(
        "Le pageType du brouillon ne peut pas être changé.",
        "TEMPLATE_PAGE_TYPE_IMMUTABLE",
        409
      );
    }

    const safeDefinition = {
      ...definition,

      id:
        draft.templateKey,

      pageType:
        draft.pageType,

      variant:
        draft.variant,

      version:
        draft.version,

      scope:
        "agency",

      status:
        "draft",
    };

    const updated =
      await this.repository
        .updateDefinition(
          draft.id,
          {
            name:
              safeDefinition.name ||
              draft.name,

            description:
              safeDefinition.description ||
              draft.description,

            definition:
              safeDefinition,

            createdBy:
              actor ||
              draft.createdBy,
          }
        );

    return {
      updated:
        true,

      publishing:
        false,

      assignmentChanged:
        false,

      draft: {
        id:
          updated.id,

        agencyId:
          normalizedAgencyId,

        templateKey:
          updated.templateKey,

        pageType:
          updated.pageType,

        variant:
          updated.variant,

        version:
          updated.version,

        status:
          updated.status,

        definition:
          updated.definition,
      },
    };
  }

  async diffDraft({
    tenantId,
    agencyId,
    draftId,
  }) {
    const {
      draft,
      agencyId:
        normalizedAgencyId,
    } =
      await this.assertAgencyDraft({
        tenantId,
        agencyId,
        draftId,
      });

    const effective =
      await this.library
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            draft.pageType,

          variant:
            draft.variant,
        });

    /*
     * Si le draft est déjà actif, resolve() peut retourner
     * ce même template. Dans ce cas le diff reste valide,
     * mais avant activation la source sera normalement
     * tenant/platform/builtin.
     */
    const diff =
      buildTemplateDiff(
        effective.template,
        draft.definition
      );

    return {
      publishing:
        false,

      draftId:
        draft.id,

      effective: {
        source:
          effective.source,

        id:
          effective.template.id,

        name:
          effective.template.name,

        version:
          effective.template.version,
      },

      draft: {
        id:
          draft.id,

        templateKey:
          draft.templateKey,

        name:
          draft.name,

        version:
          draft.version,

        status:
          draft.status,
      },

      diff,
    };
  }

  async activateDraft({
    tenantId,
    agencyId,
    draftId,
    actor =
      null,
  }) {
    const {
      draft,
      agencyId:
        normalizedAgencyId,
    } =
      await this.assertAgencyDraft({
        tenantId,
        agencyId,
        draftId,
      });

    if (
      draft.status !==
      "draft"
    ) {
      throw httpError(
        "Ce template n'est plus un brouillon.",
        "TEMPLATE_NOT_DRAFT",
        409
      );
    }

    /*
     * Validation minimale de structure avant activation.
     */
    const definition =
      draft.definition;

    if (
      !definition ||
      !Array.isArray(
        definition.sections
      )
    ) {
      throw httpError(
        "Le brouillon ne contient pas de sections valides.",
        "INVALID_TEMPLATE_DEFINITION",
        409
      );
    }

    /*
     * 1. passer la définition en active
     */
    const activatedDefinition = {
      ...definition,

      status:
        "active",

      scope:
        "agency",
    };

    const activated =
      await this.repository
        .updateDefinition(
          draft.id,
          {
            status:
              "active",

            definition:
              activatedDefinition,

            createdBy:
              actor ||
              draft.createdBy,
          }
        );

    /*
     * 2. créer/remplacer l'assignment AGENCY.
     *
     * assignmentKey garantit qu'il n'existe qu'une
     * affectation active logique pour :
     *
     * agency + pageType + variant
     */
    const assignment =
      await this.repository
        .setAssignment({
          scope:
            "agency",

          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            draft.pageType,

          variant:
            draft.variant,

          templateId:
            activated.id,

          createdBy:
            actor,
        });

    /*
     * IMPORTANT :
     *
     * activation du template != publication du mini-site.
     */
    return {
      activated:
        true,

      publishing:
        false,

      assignmentChanged:
        true,

      template: {
        id:
          activated.id,

        templateKey:
          activated.templateKey,

        status:
          activated.status,

        scope:
          activated.scope,

        pageType:
          activated.pageType,

        variant:
          activated.variant,

        version:
          activated.version,
      },

      assignment: {
        id:
          assignment.id,

        scope:
          assignment.scope,

        agencyId:
          assignment.agencyId,

        templateId:
          assignment.templateId,

        active:
          assignment.active,
      },
    };
  }

  async versionHistory({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const normalizedPageType =
      normalizePageType(
        pageType
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    const effective =
      await this.library
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            normalizedPageType,

          variant,
        });

    const versions =
      await this.repository
        .listAgencyVersions({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            normalizedPageType,

          variant,
        });

    return {
      publishing:
        false,

      effective: {
        source:
          effective.source,

        id:
          effective.template.id,

        version:
          effective.template.version,
      },

      versions:
        versions.map(
          version => ({
            id:
              version.id,

            templateKey:
              version.templateKey,

            name:
              version.name,

            version:
              version.version,

            status:
              version.status,

            pageType:
              version.pageType,

            variant:
              version.variant,

            createdAt:
              version.createdAt,

            updatedAt:
              version.updatedAt,
          })
        ),
    };
  }

  async rollbackAgencyTemplate({
    tenantId,
    agencyId,
    templateId,
    actor =
      null,
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    const target =
      await this.repository
        .getDefinition(
          templateId
        );

    if (!target) {
      throw httpError(
        "Version cible introuvable.",
        "TEMPLATE_VERSION_NOT_FOUND",
        404
      );
    }

    if (
      target.scope !==
        "agency" ||
      target.tenantId !==
        tenantId ||
      target.agencyId !==
        normalizedAgencyId
    ) {
      throw httpError(
        "Cette version n'appartient pas à cette agence.",
        "TEMPLATE_VERSION_FORBIDDEN",
        403
      );
    }

    if (
      target.status ===
      "draft"
    ) {
      throw httpError(
        "Un brouillon ne peut pas être utilisé comme rollback.",
        "TEMPLATE_VERSION_IS_DRAFT",
        409
      );
    }

    const updated =
      target.status ===
        "active"
        ? target
        : await this.repository
            .updateDefinition(
              target.id,
              {
                status:
                  "active",

                definition: {
                  ...target.definition,

                  status:
                    "active",

                  scope:
                    "agency",
                },

                createdBy:
                  actor ||
                  target.createdBy,
              }
            );

    const assignment =
      await this.repository
        .setAssignment({
          scope:
            "agency",

          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            updated.pageType,

          variant:
            updated.variant,

          templateId:
            updated.id,

          createdBy:
            actor,
        });

    return {
      rolledBack:
        true,

      publishing:
        false,

      assignmentChanged:
        true,

      template: {
        id:
          updated.id,

        templateKey:
          updated.templateKey,

        version:
          updated.version,

        status:
          updated.status,
      },

      assignment: {
        id:
          assignment.id,

        templateId:
          assignment.templateId,

        active:
          assignment.active,
      },
    };
  }

  async revertToInheritance({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    const normalizedAgencyId =
      normalizeAgencyId(
        agencyId
      );

    const normalizedPageType =
      normalizePageType(
        pageType
      );

    await this.assertAgency({
      agencyId:
        normalizedAgencyId,

      tenantId,
    });

    await this.repository
      .deactivateAgencyAssignment({
        tenantId,

        agencyId:
          normalizedAgencyId,

        pageType:
          normalizedPageType,

        variant,
      });

    const resolved =
      await this.library
        .resolve({
          tenantId,

          agencyId:
            normalizedAgencyId,

          pageType:
            normalizedPageType,

          variant,
        });

    return {
      reverted:
        true,

      publishing:
        false,

      assignmentChanged:
        true,

      source:
        resolved.source,

      template: {
        id:
          resolved.template.id,

        name:
          resolved.template.name,

        version:
          resolved.template.version,
      },
    };
  }

  async assign({
    tenantId,
    agencyId,
    scope,
    pageType,
    variant =
      "default",
    templateId,
    actor =
      null,
  }) {
    if (
      !ALLOWED_SCOPES.has(
        scope
      )
    ) {
      throw httpError(
        "Scope invalide.",
        "INVALID_TEMPLATE_SCOPE",
        400
      );
    }

    if (
      scope ===
      "platform"
    ) {
      throw httpError(
        "Les affectations plateforme ne sont pas modifiables depuis cette API.",
        "PLATFORM_ASSIGNMENT_READ_ONLY",
        403
      );
    }

    const normalizedPageType =
      normalizePageType(
        pageType
      );

    const template =
      await this.repository
        .getDefinition(
          templateId
        );

    if (!template) {
      throw httpError(
        "Template introuvable.",
        "TEMPLATE_NOT_FOUND",
        404
      );
    }

    if (
      template.status !==
      "active"
    ) {
      throw httpError(
        "Le template n'est pas actif.",
        "TEMPLATE_NOT_ACTIVE",
        409
      );
    }

    if (
      template.pageType !==
      normalizedPageType
    ) {
      throw httpError(
        "Le type de page du template ne correspond pas.",
        "TEMPLATE_PAGE_TYPE_MISMATCH",
        409
      );
    }

    let normalizedAgencyId =
      null;

    if (
      scope ===
      "agency"
    ) {
      normalizedAgencyId =
        normalizeAgencyId(
          agencyId
        );

      await this.assertAgency({
        agencyId:
          normalizedAgencyId,

        tenantId,
      });
    }

    const assignment =
      await this.repository
        .setAssignment({
          scope,

          tenantId,

          agencyId:
            scope ===
              "agency"
              ? normalizedAgencyId
              : null,

          pageType:
            normalizedPageType,

          variant,

          templateId,

          createdBy:
            actor,
        });

    return {
      changed:
        true,

      publishing:
        false,

      assignment: {
        id:
          assignment.id,

        scope:
          assignment.scope,

        tenantId:
          assignment.tenantId,

        agencyId:
          assignment.agencyId,

        pageType:
          assignment.pageType,

        variant:
          assignment.variant,

        templateId:
          assignment.templateId,

        active:
          assignment.active,
      },
    };
  }

  async listAssignments({
    tenantId,
    agencyId,
  }) {
    const platform =
      await this.repository
        .listAssignments({
          scope:
            "platform",

          tenantId:
            null,

          agencyId:
            null,
        });

    const tenant =
      await this.repository
        .listAssignments({
          scope:
            "tenant",

          tenantId,

          agencyId:
            null,
        });

    const agency =
      agencyId
        ? await this.repository
            .listAssignments({
              scope:
                "agency",

              tenantId,

              agencyId,
            })
        : [];

    return {
      agency,
      tenant,
      platform,
    };
  }
}

module.exports = {
  TemplateLibraryApiService,
  normalizePageType,
  normalizeAgencyId,
  buildTemplateDiff,
};
