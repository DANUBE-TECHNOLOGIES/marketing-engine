"use strict";

function normalizePart(
  value,
  fallback =
    "_"
) {
  const normalized =
    String(
      value ??
      ""
    )
      .trim()
      .toLowerCase();

  return normalized ||
    fallback;
}

function definitionIdentityKey({
  templateKey,
  version,
  scope,
  tenantId,
  agencyId,
}) {
  return [
    normalizePart(
      scope,
      "platform"
    ),

    normalizePart(
      tenantId
    ),

    normalizePart(
      agencyId
    ),

    normalizePart(
      templateKey
    ),

    normalizePart(
      version
    ),
  ].join(
    "::"
  );
}

function assignmentIdentityKey({
  scope,
  tenantId,
  agencyId,
  pageType,
  variant,
}) {
  return [
    normalizePart(
      scope,
      "platform"
    ),

    normalizePart(
      tenantId
    ),

    normalizePart(
      agencyId
    ),

    normalizePart(
      pageType
    ),

    normalizePart(
      variant,
      "default"
    ),
  ].join(
    "::"
  );
}

class TemplateLibraryRepository {
  constructor(
    prisma
  ) {
    if (!prisma) {
      throw new Error(
        "PrismaClient obligatoire."
      );
    }

    this.prisma =
      prisma;
  }

  createDefinition(
    input
  ) {
    const identityKey =
      input.identityKey ||
      definitionIdentityKey(
        input
      );

    return this.prisma
      .templateDefinition
      .create({
        data: {
          identityKey,

          templateKey:
            input.templateKey,

          name:
            input.name,

          description:
            input.description ||
            null,

          kind:
            input.kind ||
            "page",

          pageType:
            input.pageType,

          variant:
            input.variant ||
            "default",

          version:
            input.version,

          status:
            input.status ||
            "draft",

          scope:
            input.scope ||
            "tenant",

          tenantId:
            input.tenantId ||
            null,

          agencyId:
            input.agencyId ??
            null,

          definition:
            input.definition,

          tags:
            input.tags ||
            [],

          metadata:
            input.metadata ||
            {},

          createdBy:
            input.createdBy ||
            null,
        },
      });
  }

  upsertDefinition(
    input
  ) {
    const identityKey =
      input.identityKey ||
      definitionIdentityKey(
        input
      );

    return this.prisma
      .templateDefinition
      .upsert({
        where: {
          identityKey,
        },

        create: {
          identityKey,

          templateKey:
            input.templateKey,

          name:
            input.name,

          description:
            input.description ||
            null,

          kind:
            input.kind ||
            "page",

          pageType:
            input.pageType,

          variant:
            input.variant ||
            "default",

          version:
            input.version,

          status:
            input.status ||
            "draft",

          scope:
            input.scope ||
            "tenant",

          tenantId:
            input.tenantId ||
            null,

          agencyId:
            input.agencyId ??
            null,

          definition:
            input.definition,

          tags:
            input.tags ||
            [],

          metadata:
            input.metadata ||
            {},

          createdBy:
            input.createdBy ||
            null,
        },

        update: {
          name:
            input.name,

          description:
            input.description ||
            null,

          status:
            input.status ||
            "draft",

          definition:
            input.definition,

          tags:
            input.tags ||
            [],

          metadata:
            input.metadata ||
            {},

          createdBy:
            input.createdBy ||
            null,
        },
      });
  }

  updateDefinition(
    id,
    data
  ) {
    return this.prisma
      .templateDefinition
      .update({
        where: {
          id,
        },

        data,
      });
  }

  getDefinition(
    id
  ) {
    return this.prisma
      .templateDefinition
      .findUnique({
        where: {
          id,
        },
      });
  }

  listDefinitions({
    tenantId,
    agencyId,
    pageType,
    variant,
    status,
    scope,
  } = {}) {
    const where =
      {};

    if (
      tenantId !==
      undefined
    ) {
      where.tenantId =
        tenantId;
    }

    if (
      agencyId !==
      undefined
    ) {
      where.agencyId =
        agencyId;
    }

    if (pageType) {
      where.pageType =
        pageType;
    }

    if (variant) {
      where.variant =
        variant;
    }

    if (status) {
      where.status =
        status;
    }

    if (scope) {
      where.scope =
        scope;
    }

    return this.prisma
      .templateDefinition
      .findMany({
        where,

        orderBy: [
          {
            updatedAt:
              "desc",
          },

          {
            createdAt:
              "desc",
          },
        ],
      });
  }

  listAgencyVersions({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    return this.prisma
      .templateDefinition
      .findMany({
        where: {
          scope:
            "agency",

          tenantId,

          agencyId,

          pageType,

          variant,

          status: {
            in: [
              "draft",
              "active",
              "archived",
            ],
          },
        },

        orderBy: [
          {
            updatedAt:
              "desc",
          },

          {
            createdAt:
              "desc",
          },
        ],
      });
  }

  deactivateAgencyAssignment({
    tenantId,
    agencyId,
    pageType,
    variant =
      "default",
  }) {
    const assignmentKey =
      assignmentIdentityKey({
        scope:
          "agency",

        tenantId,

        agencyId,

        pageType,

        variant,
      });

    return this.prisma
      .templateAssignment
      .updateMany({
        where: {
          assignmentKey,

          active:
            true,
        },

        data: {
          active:
            false,
        },
      });
  }

  archiveDefinition(
    id
  ) {
    return this.prisma
      .templateDefinition
      .update({
        where: {
          id,
        },

        data: {
          status:
            "archived",
        },
      });
  }

  listAssignments({
    tenantId,
    agencyId,
    scope,
    pageType,
    variant,
    active =
      true,
  } = {}) {
    const where = {};

    if (
      tenantId !==
      undefined
    ) {
      where.tenantId =
        tenantId;
    }

    if (
      agencyId !==
      undefined
    ) {
      where.agencyId =
        agencyId;
    }

    if (scope) {
      where.scope =
        scope;
    }

    if (pageType) {
      where.pageType =
        String(
          pageType
        )
          .trim()
          .toUpperCase();
    }

    if (variant) {
      where.variant =
        variant;
    }

    if (
      active !==
      undefined
    ) {
      where.active =
        active;
    }

    return this.prisma
      .templateAssignment
      .findMany({
        where,

        include: {
          template:
            true,
        },

        orderBy: [
          {
            pageType:
              "asc",
          },

          {
            variant:
              "asc",
          },

          {
            updatedAt:
              "desc",
          },
        ],
      });
  }

  setAssignment({
    scope,
    tenantId =
      null,
    agencyId =
      null,
    pageType,
    variant =
      "default",
    templateId,
    createdBy =
      null,
  }) {
    const assignmentKey =
      assignmentIdentityKey({
        scope,
        tenantId,
        agencyId,
        pageType,
        variant,
      });

    return this.prisma
      .templateAssignment
      .upsert({
        where: {
          assignmentKey,
        },

        create: {
          assignmentKey,

          scope,

          tenantId,

          agencyId,

          pageType,

          variant,

          templateId,

          active:
            true,

          createdBy,
        },

        update: {
          templateId,

          active:
            true,

          createdBy,
        },

        include: {
          template:
            true,
        },
      });
  }

  findAssignment({
    scope,
    tenantId =
      null,
    agencyId =
      null,
    pageType,
    variant =
      "default",
  }) {
    const assignmentKey =
      assignmentIdentityKey({
        scope,
        tenantId,
        agencyId,
        pageType,
        variant,
      });

    return this.prisma
      .templateAssignment
      .findFirst({
        where: {
          assignmentKey,

          active:
            true,

          template: {
            status:
              "active",
          },
        },

        include: {
          template:
            true,
        },
      });
  }

  deactivateAssignment(
    id
  ) {
    return this.prisma
      .templateAssignment
      .update({
        where: {
          id,
        },

        data: {
          active:
            false,
        },
      });
  }
}

module.exports = {
  TemplateLibraryRepository,
  definitionIdentityKey,
  assignmentIdentityKey,
};
