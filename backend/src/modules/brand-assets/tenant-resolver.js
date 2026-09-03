"use strict";

const {
  Prisma,
} = require("@prisma/client");

const {
  brandAssetError,
} = require("./errors");

function tenantFields() {
  const model =
    Prisma.dmmf.datamodel.models
      .find(
        (entry) =>
          entry.name === "Tenant"
      );

  return new Set(
    model?.fields.map(
      (field) =>
        field.name
    ) || []
  );
}

async function resolveTenant(
  prisma,
  request
) {
  const tenantId =
    String(
      request.get(
        "x-tenant-id"
      ) || ""
    ).trim();

  if (tenantId) {
    const tenant =
      await prisma.tenant.findUnique({
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
      throw brandAssetError(
        "BRAND_ASSET_TENANT_NOT_FOUND",
        "La société demandée est introuvable.",
        {
          tenantId,
        },
        404
      );
    }

    return tenant;
  }

  const tenantSlug =
    String(
      request.get(
        "x-tenant-slug"
      ) || ""
    )
      .trim()
      .toLowerCase();

  if (!tenantSlug) {
    throw brandAssetError(
      "BRAND_ASSET_TENANT_REQUIRED",
      "L’en-tête x-tenant-id ou x-tenant-slug est obligatoire.",
      {},
      400
    );
  }

  const fields =
    tenantFields();

  const candidates = [];

  if (fields.has("slug")) {
    candidates.push({
      slug:
        tenantSlug,
    });
  }

  if (fields.has("code")) {
    candidates.push({
      code:
        tenantSlug,
    });
  }

  if (fields.has("name")) {
    candidates.push({
      name: {
        equals:
          tenantSlug,

        mode:
          "insensitive",
      },
    });
  }

  if (!candidates.length) {
    throw brandAssetError(
      "BRAND_ASSET_TENANT_SCHEMA_UNSUPPORTED",
      "Le modèle Tenant ne possède aucun champ permettant la résolution par slug.",
      {},
      500
    );
  }

  const tenant =
    await prisma.tenant.findFirst({
      where: {
        OR:
          candidates,
      },

      select: {
        id:
          true,
      },
    });

  if (!tenant) {
    throw brandAssetError(
      "BRAND_ASSET_TENANT_NOT_FOUND",
      "La société demandée est introuvable.",
      {
        tenantSlug,
      },
      404
    );
  }

  return tenant;
}

module.exports = {
  resolveTenant,
  tenantFields,
};
