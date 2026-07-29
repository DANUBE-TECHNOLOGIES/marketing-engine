const {
  NotFoundError,
  ConflictError
} = require("../../core/errors");

const slugify = require("../../core/utils/slugify");

function createAssetService(repository) {
  async function requireAsset(tenantId, id) {
    const asset = await repository.findById(
      tenantId,
      id
    );

    if (!asset) {
      throw new NotFoundError(
        "Asset introuvable."
      );
    }

    return asset;
  }

  async function ensureSlugAvailable(
    tenantId,
    slug,
    excludedAssetId = null
  ) {
    const existing = await repository.findBySlug(
      tenantId,
      slug
    );

    if (
      existing &&
      existing.id !== excludedAssetId &&
      existing.deletedAt === null
    ) {
      throw new ConflictError(
        `Le slug "${slug}" est déjà utilisé.`
      );
    }
  }

  async function list(context, filters) {
    return repository.list({
      tenantId: context.tenantId,
      ...filters
    });
  }

  async function get(context, id) {
    return requireAsset(context.tenantId, id);
  }

  async function create(context, data) {
    await ensureSlugAvailable(
      context.tenantId,
      data.slug
    );

    return repository.createWithVersion({
      tenantId: context.tenantId,
      data,
      userId: context.userId
    });
  }

  async function update(context, id, data) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    if (data.slug) {
      await ensureSlugAvailable(
        context.tenantId,
        data.slug,
        asset.id
      );
    }

    return repository.updateWithVersion({
      asset,
      data,
      userId: context.userId
    });
  }

  async function listVersions(context, id) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    return repository.listVersions(asset.id);
  }

  async function getVersion(
    context,
    id,
    version
  ) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    const result = await repository.findVersion(
      asset.id,
      version
    );

    if (!result) {
      throw new NotFoundError(
        "Version d’Asset introuvable."
      );
    }

    return result;
  }

  async function publish(context, id) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    return repository.changeLifecycle({
      asset,
      status: "published",
      userId: context.userId
    });
  }

  async function archive(context, id) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    return repository.changeLifecycle({
      asset,
      status: "archived",
      userId: context.userId
    });
  }

  async function duplicate(context, id) {
    const source = await requireAsset(
      context.tenantId,
      id
    );

    const baseSlug = `${source.slug}-copie`;
    let slug = baseSlug;
    let suffix = 2;

    while (
      await repository.findBySlug(
        context.tenantId,
        slug
      )
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return repository.duplicate({
      source,
      slug: slugify(slug),
      title: `${source.title} — copie`,
      userId: context.userId
    });
  }

  async function remove(context, id) {
    const asset = await requireAsset(
      context.tenantId,
      id
    );

    await repository.softDelete(
      asset.id,
      context.userId
    );

    return {
      success: true,
      id: asset.id
    };
  }

  return {
    list,
    get,
    create,
    update,
    listVersions,
    getVersion,
    publish,
    archive,
    duplicate,
    remove
  };
}

module.exports = createAssetService;
