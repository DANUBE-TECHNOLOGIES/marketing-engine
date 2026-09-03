"use strict";

const ENTITY_TYPES = new Set([
  "countries",
  "regions",
  "cities",
  "destinations",
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;

  return ["1", "true", "yes", "oui"].includes(
    String(value).trim().toLowerCase()
  );
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArray(value) {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  if (!value) return [];

  return String(value)
    .split(/[|;]/)
    .map(normalizeText)
    .filter(Boolean);
}

function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(csv) {
  const lines = String(csv || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    normalizeText(header)
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);

    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function parsePayload(payload) {
  if (!payload || typeof payload !== "object") {
    const error = new Error("Le corps de la requête est obligatoire.");
    error.statusCode = 400;
    error.code = "IMPORT_PAYLOAD_REQUIRED";
    throw error;
  }

  const entityType = normalizeText(payload.entityType).toLowerCase();

  if (!ENTITY_TYPES.has(entityType)) {
    const error = new Error(
      `entityType doit être l'une des valeurs suivantes : ${[
        ...ENTITY_TYPES,
      ].join(", ")}.`
    );
    error.statusCode = 400;
    error.code = "INVALID_IMPORT_ENTITY";
    throw error;
  }

  const format = normalizeText(payload.format || "json").toLowerCase();

  if (!["json", "csv"].includes(format)) {
    const error = new Error("Le format doit être json ou csv.");
    error.statusCode = 400;
    error.code = "INVALID_IMPORT_FORMAT";
    throw error;
  }

  let rows;

  if (format === "csv") {
    rows = parseCsv(payload.data);
  } else {
    rows = payload.data;
  }

  if (!Array.isArray(rows)) {
    const error = new Error("Les données JSON doivent être un tableau.");
    error.statusCode = 400;
    error.code = "INVALID_IMPORT_DATA";
    throw error;
  }

  if (rows.length > 1000) {
    const error = new Error("Un import est limité à 1000 lignes.");
    error.statusCode = 400;
    error.code = "IMPORT_LIMIT_EXCEEDED";
    throw error;
  }

  return {
    entityType,
    format,
    rows,
    dryRun: parseBoolean(payload.dryRun, true),
  };
}

class TravelCoreImporter {
  constructor(prisma, tenantId) {
    if (!prisma) throw new Error("TravelCoreImporter requires Prisma");
    if (!tenantId) throw new Error("TravelCoreImporter requires tenantId");

    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  async import(payload) {
    const input = parsePayload(payload);

    const report = {
      entityType: input.entityType,
      format: input.format,
      dryRun: input.dryRun,
      received: input.rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      items: [],
    };

    for (let index = 0; index < input.rows.length; index += 1) {
      try {
        const result = await this.importRow(
          input.entityType,
          input.rows[index],
          input.dryRun
        );

        report[result.action] += 1;
        report.items.push({
          row: index + 1,
          action: result.action,
          id: result.id || null,
          slug: result.slug || null,
          name: result.name || null,
        });
      } catch (error) {
        report.failed += 1;
        report.errors.push({
          row: index + 1,
          code: error.code || "IMPORT_ROW_FAILED",
          message: error.message,
        });
      }
    }

    return report;
  }

  importRow(entityType, row, dryRun) {
    switch (entityType) {
      case "countries":
        return this.importCountry(row, dryRun);
      case "regions":
        return this.importRegion(row, dryRun);
      case "cities":
        return this.importCity(row, dryRun);
      case "destinations":
        return this.importDestination(row, dryRun);
      default:
        throw new Error(`Type d'entité non pris en charge : ${entityType}`);
    }
  }

  async importCountry(row, dryRun) {
    const name = normalizeText(row.name);
    const slug = slugify(row.slug || name);

    if (!name || !slug) {
      const error = new Error("Le pays doit contenir name.");
      error.code = "COUNTRY_NAME_REQUIRED";
      throw error;
    }

    const existing = await this.prisma.country.findUnique({
      where: { slug },
    });

    const data = {
      name,
      slug,
      iso2: normalizeText(row.iso2).toUpperCase() || null,
      iso3: normalizeText(row.iso3).toUpperCase() || null,
      continent: normalizeText(row.continent) || null,
      currency: normalizeText(row.currency) || null,
      languages: parseArray(row.languages),
      timezone: normalizeText(row.timezone) || null,
      status: normalizeText(row.status) || "draft",
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? row.metadata
          : undefined,
    };

    if (dryRun) {
      return {
        action: existing ? "updated" : "created",
        id: existing?.id,
        slug,
        name,
      };
    }

    const saved = existing
      ? await this.prisma.country.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.country.create({ data });

    return {
      action: existing ? "updated" : "created",
      id: saved.id,
      slug: saved.slug,
      name: saved.name,
    };
  }

  async resolveCountry(row) {
    const countryId = normalizeText(row.countryId);

    if (countryId) {
      return this.prisma.country.findUnique({ where: { id: countryId } });
    }

    const countrySlug = slugify(row.countrySlug || row.country);

    if (!countrySlug) return null;

    return this.prisma.country.findUnique({
      where: { slug: countrySlug },
    });
  }

  async importRegion(row, dryRun) {
    const name = normalizeText(row.name);
    const slug = slugify(row.slug || name);
    const country = await this.resolveCountry(row);

    if (!name || !slug) {
      const error = new Error("La région doit contenir name.");
      error.code = "REGION_NAME_REQUIRED";
      throw error;
    }

    if (!country) {
      const error = new Error("Le pays associé à la région est introuvable.");
      error.code = "REGION_COUNTRY_NOT_FOUND";
      throw error;
    }

    const existing = await this.prisma.region.findUnique({
      where: {
        countryId_slug: {
          countryId: country.id,
          slug,
        },
      },
    });

    const data = {
      countryId: country.id,
      name,
      slug,
      code: normalizeText(row.code) || null,
      status: normalizeText(row.status) || "draft",
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? row.metadata
          : undefined,
    };

    if (dryRun) {
      return {
        action: existing ? "updated" : "created",
        id: existing?.id,
        slug,
        name,
      };
    }

    const saved = existing
      ? await this.prisma.region.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.region.create({ data });

    return {
      action: existing ? "updated" : "created",
      id: saved.id,
      slug: saved.slug,
      name: saved.name,
    };
  }

  async resolveRegion(row, countryId) {
    const regionId = normalizeText(row.regionId);

    if (regionId) {
      return this.prisma.region.findFirst({
        where: { id: regionId, countryId },
      });
    }

    const regionSlug = slugify(row.regionSlug || row.region);
    if (!regionSlug) return null;

    return this.prisma.region.findUnique({
      where: {
        countryId_slug: {
          countryId,
          slug: regionSlug,
        },
      },
    });
  }

  async importCity(row, dryRun) {
    const name = normalizeText(row.name);
    const slug = slugify(row.slug || name);
    const country = await this.resolveCountry(row);

    if (!name || !slug) {
      const error = new Error("La ville doit contenir name.");
      error.code = "CITY_NAME_REQUIRED";
      throw error;
    }

    if (!country) {
      const error = new Error("Le pays associé à la ville est introuvable.");
      error.code = "CITY_COUNTRY_NOT_FOUND";
      throw error;
    }

    const region = await this.resolveRegion(row, country.id);

    const existing = await this.prisma.city.findUnique({
      where: {
        countryId_slug: {
          countryId: country.id,
          slug,
        },
      },
    });

    const data = {
      countryId: country.id,
      regionId: region?.id || null,
      name,
      slug,
      latitude: parseNumber(row.latitude),
      longitude: parseNumber(row.longitude),
      status: normalizeText(row.status) || "draft",
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? row.metadata
          : undefined,
    };

    if (dryRun) {
      return {
        action: existing ? "updated" : "created",
        id: existing?.id,
        slug,
        name,
      };
    }

    const saved = existing
      ? await this.prisma.city.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.city.create({ data });

    return {
      action: existing ? "updated" : "created",
      id: saved.id,
      slug: saved.slug,
      name: saved.name,
    };
  }

  async resolveCity(row, countryId) {
    const cityId = normalizeText(row.cityId);

    if (cityId) {
      return this.prisma.city.findFirst({
        where: { id: cityId, countryId },
      });
    }

    const citySlug = slugify(row.citySlug || row.city);
    if (!citySlug) return null;

    return this.prisma.city.findUnique({
      where: {
        countryId_slug: {
          countryId,
          slug: citySlug,
        },
      },
    });
  }

  async importDestination(row, dryRun) {
    const name = normalizeText(row.name);
    const slug = slugify(row.slug || name);
    const country = await this.resolveCountry(row);

    if (!name || !slug) {
      const error = new Error("La destination doit contenir name.");
      error.code = "DESTINATION_NAME_REQUIRED";
      throw error;
    }

    if (!country) {
      const error = new Error(
        "Le pays associé à la destination est introuvable."
      );
      error.code = "DESTINATION_COUNTRY_NOT_FOUND";
      throw error;
    }

    const region = await this.resolveRegion(row, country.id);
    const city = await this.resolveCity(row, country.id);

    const existing = await this.prisma.destination.findUnique({
      where: {
        tenantId_slug: {
          tenantId: this.tenantId,
          slug,
        },
      },
    });

    const data = {
      tenantId: this.tenantId,
      name,
      slug,
      country: country.name,
      region: region?.name || normalizeText(row.region) || null,
      countryId: country.id,
      regionId: region?.id || null,
      cityId: city?.id || null,
      type: normalizeText(row.type) || "destination",
      status: normalizeText(row.status) || "draft",
      tagline: normalizeText(row.tagline) || null,
      summary: normalizeText(row.summary) || null,
      seoTitle: normalizeText(row.seoTitle) || null,
      seoDescription: normalizeText(row.seoDescription) || null,
      latitude: parseNumber(row.latitude),
      longitude: parseNumber(row.longitude),
      bestTime: normalizeText(row.bestTime) || null,
      idealDuration: normalizeText(row.idealDuration) || null,
      currency: normalizeText(row.currency || country.currency) || null,
      language:
        normalizeText(row.language) ||
        country.languages?.[0] ||
        null,
      highlights: parseArray(row.highlights),
      audiences: parseArray(row.audiences),
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? row.metadata
          : undefined,
    };

    if (dryRun) {
      return {
        action: existing ? "updated" : "created",
        id: existing?.id,
        slug,
        name,
      };
    }

    const saved = existing
      ? await this.prisma.destination.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.destination.create({ data });

    return {
      action: existing ? "updated" : "created",
      id: saved.id,
      slug: saved.slug,
      name: saved.name,
    };
  }
}

module.exports = {
  ENTITY_TYPES,
  TravelCoreImporter,
  parseCsv,
  parsePayload,
  slugify,
};
