const {
  requireTenantId,
  getUserId,
  validateCreateAsset,
  validateUpdateAsset,
  parseListQuery
} = require("./validation");

function createAssetController(service) {
  function context(req) {
    return {
      tenantId: requireTenantId(req),
      userId: getUserId(req)
    };
  }

  async function list(req, res) {
    const result = await service.list(
      context(req),
      parseListQuery(req.query)
    );

    res.json(result);
  }

  async function get(req, res) {
    const asset = await service.get(
      context(req),
      req.params.id
    );

    res.json(asset);
  }

  async function create(req, res) {
    const asset = await service.create(
      context(req),
      validateCreateAsset(req.body)
    );

    res.status(201).json(asset);
  }

  async function update(req, res) {
    const asset = await service.update(
      context(req),
      req.params.id,
      validateUpdateAsset(req.body)
    );

    res.json(asset);
  }

  async function listVersions(req, res) {
    const versions = await service.listVersions(
      context(req),
      req.params.id
    );

    res.json(versions);
  }

  async function getVersion(req, res) {
    const version = await service.getVersion(
      context(req),
      req.params.id,
      Number(req.params.version)
    );

    res.json(version);
  }

  async function publish(req, res) {
    const asset = await service.publish(
      context(req),
      req.params.id
    );

    res.json(asset);
  }

  async function archive(req, res) {
    const asset = await service.archive(
      context(req),
      req.params.id
    );

    res.json(asset);
  }

  async function duplicate(req, res) {
    const asset = await service.duplicate(
      context(req),
      req.params.id
    );

    res.status(201).json(asset);
  }

  async function remove(req, res) {
    const result = await service.remove(
      context(req),
      req.params.id
    );

    res.json(result);
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

module.exports = createAssetController;
