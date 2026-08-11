"use strict";

const {
  Prisma,
} = require("@prisma/client");

const {
  publicBrandLegalError,
} = require("./errors");

function modelFields(modelName) {
  const model = Prisma.dmmf.datamodel.models.find(
    (entry) => entry.name === modelName
  );

  return new Set(model?.fields.map((field) => field.name) || []);
}

function agencySiteSelect() {
  const fields = modelFields("AgencySite");

  const select = {
    id: true,
    agencyId: true,
    slug: true,
  };

  for (const field of [
    "tenantId",
    "name",
    "basePath",
    "status",
    "publishedAt",
    "generatedAt",
    "createdAt",
    "updatedAt",
  ]) {
    if (fields.has(field)) {
      select[field] = true;
    }
  }

  select.agency = {
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  };

  return select;
}

function normalizeSiteSlug(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_SITE_SLUG_REQUIRED",
      "Le slug du mini-site est obligatoire."
    );
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_SITE_SLUG_INVALID",
      "Le slug du mini-site est invalide.",
      { siteSlug: value }
    );
  }

  return normalized;
}

function normalizeAgencyId(value) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_AGENCY_ID_INVALID",
      "L’identifiant de l’agence doit être un entier positif.",
      { agencyId: value }
    );
  }

  return normalized;
}

function requireTenantId(value) {
  const tenantId = String(value || "").trim();

  if (!tenantId) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_TENANT_REQUIRED",
      "Le tenant est obligatoire pour le runtime public Brand + Legal."
    );
  }

  return tenantId;
}

async function findSiteBySlug({
  prisma,
  siteSlug,
  tenantId,
}) {
  const normalizedSlug = normalizeSiteSlug(siteSlug);
  const normalizedTenantId = requireTenantId(tenantId);

  const site = await prisma.agencySite.findFirst({
    where: {
      slug: normalizedSlug,
      tenantId: normalizedTenantId,
    },
    select: agencySiteSelect(),
  });

  if (!site) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_SITE_NOT_FOUND",
      "Le mini-site demandé est introuvable.",
      {
        siteSlug: normalizedSlug,
        tenantId: normalizedTenantId,
      },
      404
    );
  }

  return site;
}

async function findSiteByAgencyId({
  prisma,
  agencyId,
  tenantId,
}) {
  const normalizedAgencyId = normalizeAgencyId(agencyId);
  const normalizedTenantId = requireTenantId(tenantId);

  const site = await prisma.agencySite.findFirst({
    where: {
      agencyId: normalizedAgencyId,
      tenantId: normalizedTenantId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: agencySiteSelect(),
  });

  if (!site) {
    throw publicBrandLegalError(
      "PUBLIC_BRAND_LEGAL_SITE_NOT_FOUND",
      "Aucun mini-site n’est associé à cette agence.",
      {
        agencyId: normalizedAgencyId,
        tenantId: normalizedTenantId,
      },
      404
    );
  }

  return site;
}

function publicSiteContract(site) {
  return {
    id: site.id,
    slug: site.slug,
    agencyId: site.agencyId,
    tenantId: site.tenantId ?? site.agency?.tenantId ?? null,
    name: site.name ?? null,
    basePath: site.basePath ?? null,
    status: site.status ?? null,
    publishedAt: site.publishedAt ?? null,
    agency: {
      id: site.agency?.id ?? site.agencyId,
      name: site.agency?.name ?? null,
      tenantId: site.agency?.tenantId ?? site.tenantId ?? null,
    },
  };
}

module.exports = {
  modelFields,
  agencySiteSelect,
  normalizeSiteSlug,
  normalizeAgencyId,
  requireTenantId,
  findSiteBySlug,
  findSiteByAgencyId,
  publicSiteContract,
};
