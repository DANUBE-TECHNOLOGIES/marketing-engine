"use strict";

const {
  legalProfileError,
} = require("./errors");

const SHORT_TEXT_FIELDS =
  Object.freeze([
    "name",
    "legalName",
    "legalForm",
    "shareCapital",
    "registeredOffice",
    "registrationNumber",
    "vatNumber",
    "travelRegistration",
    "financialGuarantee",
    "professionalInsurance",
    "publicationDirector",
    "hostingProvider",
    "hostingAddress",
    "hostingPhone",
    "dataController",
    "privacyContactEmail",
    "dataProtectionOfficer",
    "mediatorName",
    "mediatorAddress",
    "mediatorWebsite",
  ]);

const CONTENT_FIELDS =
  Object.freeze([
    "legalNoticeContent",
    "privacyPolicyContent",
    "cookiePolicyContent",
    "termsContent",
  ]);

function normalizeAgencyId(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (!Number.isInteger(parsed)) {
    throw legalProfileError(
      "LEGAL_PROFILE_AGENCY_ID_INVALID",
      "L’identifiant de l’agence doit être un entier.",
      {
        agencyId:
          value,
      }
    );
  }

  return parsed;
}

function normalizeOptionalText(
  value,
  maxLength = 1000
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw legalProfileError(
      "LEGAL_PROFILE_TEXT_TOO_LONG",
      `Le contenu dépasse la limite de ${maxLength} caractères.`,
      {
        maxLength,
        actualLength:
          normalized.length,
      }
    );
  }

  return normalized;
}

function normalizeEmail(
  value
) {
  const normalized =
    normalizeOptionalText(
      value,
      320
    );

  if (
    normalized === undefined ||
    normalized === null
  ) {
    return normalized;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized
    )
  ) {
    throw legalProfileError(
      "LEGAL_PROFILE_EMAIL_INVALID",
      "L’adresse électronique est invalide.",
      {
        value:
          normalized,
      }
    );
  }

  return normalized;
}

function normalizeUrl(
  value
) {
  const normalized =
    normalizeOptionalText(
      value,
      2000
    );

  if (
    normalized === undefined ||
    normalized === null
  ) {
    return normalized;
  }

  let parsed;

  try {
    parsed =
      new URL(normalized);
  } catch {
    throw legalProfileError(
      "LEGAL_PROFILE_URL_INVALID",
      "L’adresse URL est invalide.",
      {
        value:
          normalized,
      }
    );
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      parsed.protocol
    )
  ) {
    throw legalProfileError(
      "LEGAL_PROFILE_URL_PROTOCOL_INVALID",
      "Seules les URL HTTP et HTTPS sont autorisées.",
      {
        value:
          normalized,
      }
    );
  }

  return normalized;
}

function normalizeDate(
  value
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw legalProfileError(
      "LEGAL_PROFILE_DATE_INVALID",
      "La date d’entrée en vigueur est invalide.",
      {
        value,
      }
    );
  }

  return date;
}

function mergeDefined(
  shared,
  override
) {
  const result = {
    ...(shared || {}),
  };

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      override || {}
    )
  ) {
    if (
      value !== undefined &&
      value !== null
    ) {
      result[key] =
        value;
    }
  }

  return result;
}

class LegalProfileService {
  constructor({
    prisma,
  } = {}) {
    if (!prisma) {
      throw legalProfileError(
        "LEGAL_PROFILE_PRISMA_REQUIRED",
        "Le client Prisma est obligatoire.",
        {},
        500
      );
    }

    this.prisma =
      prisma;
  }

  async assertScope({
    tenantId,
    agencyId,
  }) {
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
          },
        });

    if (!tenant) {
      throw legalProfileError(
        "LEGAL_PROFILE_TENANT_NOT_FOUND",
        "La société est introuvable.",
        {
          tenantId,
        },
        404
      );
    }

    if (agencyId === null) {
      return;
    }

    const agency =
      await this.prisma
        .agency
        .findFirst({
          where: {
            id:
              agencyId,

            tenantId,
          },

          select: {
            id:
              true,
          },
        });

    if (!agency) {
      throw legalProfileError(
        "LEGAL_PROFILE_AGENCY_NOT_FOUND",
        "L’agence est introuvable pour cette société.",
        {
          tenantId,
          agencyId,
        },
        404
      );
    }
  }

  normalizeInput(
    input
  ) {
    const data = {};

    for (
      const field
      of SHORT_TEXT_FIELDS
    ) {
      let normalized;

      if (
        field ===
        "privacyContactEmail"
      ) {
        normalized =
          normalizeEmail(
            input[field]
          );
      } else if (
        field ===
        "mediatorWebsite"
      ) {
        normalized =
          normalizeUrl(
            input[field]
          );
      } else {
        normalized =
          normalizeOptionalText(
            input[field],
            3000
          );
      }

      if (
        normalized !==
        undefined
      ) {
        data[field] =
          normalized;
      }
    }

    for (
      const field
      of CONTENT_FIELDS
    ) {
      const normalized =
        normalizeOptionalText(
          input[field],
          100000
        );

      if (
        normalized !==
        undefined
      ) {
        data[field] =
          normalized;
      }
    }

    const effectiveDate =
      normalizeDate(
        input.effectiveDate
      );

    if (
      effectiveDate !==
      undefined
    ) {
      data.effectiveDate =
        effectiveDate;
    }

    if (
      input.settings !==
      undefined
    ) {
      if (
        !input.settings ||
        typeof input.settings !==
          "object" ||
        Array.isArray(
          input.settings
        )
      ) {
        throw legalProfileError(
          "LEGAL_PROFILE_SETTINGS_INVALID",
          "settings doit être un objet JSON."
        );
      }

      data.settings =
        input.settings;
    }

    if (
      input.isDefault !==
      undefined
    ) {
      data.isDefault =
        Boolean(
          input.isDefault
        );
    }

    return data;
  }

  async getRaw({
    tenantId,
    agencyId,
  }) {
    return this.prisma
      .legalProfile
      .findFirst({
        where: {
          tenantId,
          agencyId,
        },
      });
  }

  async getResolved({
    tenantId,
    agencyId,
  }) {
    await this.assertScope({
      tenantId,
      agencyId,
    });

    const shared =
      await this.getRaw({
        tenantId,
        agencyId:
          null,
      });

    if (
      agencyId === null
    ) {
      return {
        scope:
          "tenant",

        inherited:
          false,

        shared,

        override:
          null,

        resolved:
          shared,
      };
    }

    const override =
      await this.getRaw({
        tenantId,
        agencyId,
      });

    if (
      !shared &&
      !override
    ) {
      return {
        scope:
          "agency",

        inherited:
          false,

        shared:
          null,

        override:
          null,

        resolved:
          null,
      };
    }

    return {
      scope:
        "agency",

      inherited:
        Boolean(shared),

      shared,

      override,

      resolved:
        mergeDefined(
          shared,
          override
        ),
    };
  }

  async save({
    tenantId,
    agencyId,
    input,
  }) {
    await this.assertScope({
      tenantId,
      agencyId,
    });

    const data =
      this.normalizeInput(
        input || {}
      );

    const existing =
      await this.prisma
        .legalProfile
        .findFirst({
          where: {
            tenantId,
            agencyId,
          },

          select: {
            id:
              true,
          },
        });

    const fallbackName =
      agencyId === null
        ? "Profil juridique société"
        : `Profil juridique agence ${agencyId}`;

    const name =
      data.name ||
      fallbackName;

    if (existing) {
      return this.prisma
        .legalProfile
        .update({
          where: {
            id:
              existing.id,
          },

          data: {
            ...data,
            name,
          },
        });
    }

    return this.prisma
      .legalProfile
      .create({
        data: {
          tenantId,
          agencyId,
          name,
          ...data,
        },
      });
  }

  async removeOverride({
    tenantId,
    agencyId,
  }) {
    if (
      agencyId === null
    ) {
      throw legalProfileError(
        "LEGAL_PROFILE_SHARED_DELETE_FORBIDDEN",
        "Le profil juridique société ne peut pas être supprimé par cette route."
      );
    }

    const existing =
      await this.prisma
        .legalProfile
        .findFirst({
          where: {
            tenantId,
            agencyId,
          },

          select: {
            id:
              true,
          },
        });

    if (!existing) {
      return {
        deleted:
          false,
      };
    }

    await this.prisma
      .legalProfile
      .delete({
        where: {
          id:
            existing.id,
        },
      });

    return {
      deleted:
        true,

      id:
        existing.id,
    };
  }
}

module.exports = {
  LegalProfileService,

  SHORT_TEXT_FIELDS,
  CONTENT_FIELDS,

  normalizeAgencyId,
  normalizeOptionalText,
  normalizeEmail,
  normalizeUrl,
  normalizeDate,
  mergeDefined,
};
