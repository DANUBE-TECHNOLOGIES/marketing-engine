const repository = require("./knowledge.repository");
const slugify = require("../core/utils/slugify");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../core/errors");
const {
  validateCreatePayload,
  validateUpdatePayload,
  validateListQuery,
} = require("./knowledge.validation");
const {
  toSummaryDto,
  toDetailDto,
  toPaginatedDto,
} = require("./knowledge.mapper");

function buildListWhere(filters) {
  const where = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.language) {
    where.language = filters.language;
  }

  if (filters.search) {
    where.OR = [
      {
        title: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        summary: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        slug: {
          contains: slugify(filters.search),
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

async function ensureUniqueSlug(slug, language, excludedId = null) {
  const existing =
    await repository.findBySlugAndLanguage(slug, language);

  if (existing && existing.id !== excludedId) {
    throw new ConflictError(
      `Le slug "${slug}" existe déjà pour la langue "${language}".`,
      {
        slug,
        language,
        entityId: existing.id,
      }
    );
  }
}

function handlePrismaError(error) {
  if (error?.code === "P2002") {
    throw new ConflictError(
      "Une entité possédant ces valeurs uniques existe déjà.",
      {
        target: error.meta?.target || null,
      }
    );
  }

  if (error?.code === "P2025") {
    throw new NotFoundError("Entité Knowledge introuvable.");
  }

  throw error;
}

async function list(query) {
  const filters = validateListQuery(query);
  const where = buildListWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total] = await Promise.all([
    repository.findAll({
      where,
      skip,
      take: filters.pageSize,
    }),
    repository.count(where),
  ]);

  return toPaginatedDto(items, {
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / filters.pageSize),
  });
}

async function getById(id) {
  if (!id) {
    throw new ValidationError(
      "L'identifiant Knowledge est obligatoire."
    );
  }

  const entity = await repository.findById(id);

  if (!entity) {
    throw new NotFoundError("Entité Knowledge introuvable.", {
      id,
    });
  }

  return toDetailDto(entity);
}

async function create(payload) {
  const data = validateCreatePayload(payload);
  const generatedSlug = slugify(data.slug || data.title);

  if (!generatedSlug) {
    throw new ValidationError(
      "Impossible de générer un slug valide."
    );
  }

  await ensureUniqueSlug(generatedSlug, data.language);

  try {
    const entity = await repository.create({
      ...data,
      slug: generatedSlug,
      publishedAt:
        data.status === "published"
          ? data.publishedAt || new Date()
          : data.publishedAt || null,
    });

    return toSummaryDto(entity);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function update(id, payload) {
  const current = await repository.findById(id);

  if (!current) {
    throw new NotFoundError("Entité Knowledge introuvable.", {
      id,
    });
  }

  const data = validateUpdatePayload(payload);
  const language = data.language || current.language;

  if (data.slug !== undefined) {
    data.slug = slugify(data.slug);

    if (!data.slug) {
      throw new ValidationError(
        "Impossible de générer un slug valide."
      );
    }
  }

  const finalSlug = data.slug || current.slug;

  if (
    finalSlug !== current.slug ||
    language !== current.language
  ) {
    await ensureUniqueSlug(finalSlug, language, id);
  }

  if (
    data.status === "published" &&
    data.publishedAt === undefined &&
    !current.publishedAt
  ) {
    data.publishedAt = new Date();
  }

  if (
    data.status !== undefined &&
    data.status !== "published" &&
    payload.publishedAt === undefined
  ) {
    data.publishedAt = null;
  }

  try {
    const entity = await repository.update(id, data);
    return toSummaryDto(entity);
  } catch (error) {
    return handlePrismaError(error);
  }
}

async function remove(id) {
  const current = await repository.findById(id);

  if (!current) {
    throw new NotFoundError("Entité Knowledge introuvable.", {
      id,
    });
  }

  try {
    await repository.remove(id);

    return {
      id,
      deleted: true,
    };
  } catch (error) {
    return handlePrismaError(error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
