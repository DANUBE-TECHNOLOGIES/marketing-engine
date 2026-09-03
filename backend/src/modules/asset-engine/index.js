const createRepository = require("./repository");
const createService = require("./service");
const createController = require("./controller");
const createRoutes = require("./routes");
const createMediaUploadRoutes = require("./media-upload-routes");

function routes({ prisma }) {
  const repository = createRepository(prisma);
  const service = createService(repository);
  const controller = createController(service);

  const router = createRoutes(controller);

  router.use(
    createMediaUploadRoutes()
  );

  return router;
}

module.exports = {
  routes
};
